"""Step 2 (code-first, hybrid): collect recent papers per contest field.

Deterministic retrieval from free scholarly APIs (no key required):
  - arXiv  (Atom XML)
  - OpenAlex (JSON)
  - Crossref (JSON)
Optionally supplemented by one Claude web-search call to catch Korean/KCI
papers and gaps the English APIs miss (`--korean-search`). Results are
deduplicated by normalized title and capped.

Network calls are best-effort: a failing source is skipped with a warning so a
flaky API never aborts the pipeline.
"""
from __future__ import annotations

import json
import re
import sys
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

from .claude_client import ClaudeRunner

_UA = "contest-idea-forge/0.1 (mailto:noreply@example.com)"
_PROMPT_DIR = Path(__file__).resolve().parent / "prompts"


def _get(url: str, timeout: int = 30) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": _UA})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def _norm_title(t: str) -> str:
    return re.sub(r"[^a-z0-9가-힣]", "", (t or "").lower())


def _warn(msg: str) -> None:
    print(f"[search] {msg}", file=sys.stderr)


# --- individual sources ---------------------------------------------------
def search_arxiv(query: str, max_results: int = 6, from_year: int = 2023) -> list[dict]:
    q = urllib.parse.quote(query)
    url = (f"http://export.arxiv.org/api/query?search_query=all:{q}"
           f"&start=0&max_results={max_results}&sortBy=submittedDate&sortOrder=descending")
    out: list[dict] = []
    try:
        root = ET.fromstring(_get(url))
    except Exception as e:  # noqa: BLE001
        _warn(f"arXiv failed for '{query}': {e}")
        return out
    ns = {"a": "http://www.w3.org/2005/Atom"}
    for e in root.findall("a:entry", ns):
        title = (e.findtext("a:title", default="", namespaces=ns) or "").strip()
        published = e.findtext("a:published", default="", namespaces=ns) or ""
        year = published[:4]
        if year.isdigit() and int(year) < from_year:
            continue
        authors = [a.findtext("a:name", default="", namespaces=ns)
                   for a in e.findall("a:author", ns)]
        out.append({
            "title": re.sub(r"\s+", " ", title),
            "authors": ", ".join(a for a in authors if a)[:300],
            "venue": "arXiv",
            "year": year,
            "url": e.findtext("a:id", default="", namespaces=ns),
            "abstract": re.sub(r"\s+", " ", (e.findtext("a:summary", default="", namespaces=ns) or "")).strip()[:600],
            "source": "arxiv",
        })
    return out


def search_openalex(query: str, per_page: int = 6, from_year: int = 2023) -> list[dict]:
    params = urllib.parse.urlencode({
        "search": query,
        "filter": f"from_publication_date:{from_year}-01-01",
        "per_page": per_page,
        "sort": "relevance_score:desc",
    })
    out: list[dict] = []
    try:
        data = json.loads(_get(f"https://api.openalex.org/works?{params}"))
    except Exception as e:  # noqa: BLE001
        _warn(f"OpenAlex failed for '{query}': {e}")
        return out
    for w in data.get("results", []):
        venue = ((w.get("primary_location") or {}).get("source") or {}).get("display_name") or ""
        out.append({
            "title": (w.get("title") or "").strip(),
            "authors": ", ".join(
                (a.get("author") or {}).get("display_name", "")
                for a in (w.get("authorships") or [])[:6]
            )[:300],
            "venue": venue or "OpenAlex",
            "year": str(w.get("publication_year") or ""),
            "url": w.get("doi") or w.get("id") or "",
            "abstract": "",
            "source": "openalex",
        })
    return out


def search_crossref(query: str, rows: int = 6, from_year: int = 2023) -> list[dict]:
    params = urllib.parse.urlencode({
        "query": query, "rows": rows,
        "filter": f"from-pub-date:{from_year}-01-01", "sort": "relevance",
    })
    out: list[dict] = []
    try:
        data = json.loads(_get(f"https://api.crossref.org/works?{params}"))
    except Exception as e:  # noqa: BLE001
        _warn(f"Crossref failed for '{query}': {e}")
        return out
    for it in data.get("message", {}).get("items", []):
        title = " ".join(it.get("title") or []).strip()
        if not title:
            continue
        parts = (it.get("published") or {}).get("date-parts") or [[None]]
        year = str(parts[0][0]) if parts and parts[0] and parts[0][0] else ""
        out.append({
            "title": title,
            "authors": ", ".join(
                f"{a.get('given','')} {a.get('family','')}".strip()
                for a in (it.get("author") or [])[:6]
            )[:300],
            "venue": " ".join(it.get("container-title") or []) or "Crossref",
            "year": year,
            "url": it.get("URL", ""),
            "abstract": "",
            "source": "crossref",
        })
    return out


def claude_supplement(contest: dict, runner: ClaudeRunner,
                      model: str | None = None) -> list[dict]:
    """One web-enabled Claude call for Korean/KCI papers the APIs miss."""
    prompt = (_PROMPT_DIR / "search_supplement.md").read_text(encoding="utf-8")
    prompt = (prompt
              .replace("{{FIELD}}", str(contest.get("field", "")))
              .replace("{{THEME}}", str(contest.get("theme", "")))
              .replace("{{KEYWORDS}}", ", ".join(contest.get("search_keywords", []) or [])))
    try:
        data = runner.run_json(prompt, model=model, allow_web=True)
    except Exception as e:  # noqa: BLE001
        _warn(f"Claude supplement skipped: {e}")
        return []
    papers = data.get("papers", []) if isinstance(data, dict) else data
    out = []
    for p in papers or []:
        if isinstance(p, dict) and p.get("title"):
            p.setdefault("source", "claude-web")
            out.append(p)
    return out


# --- orchestration --------------------------------------------------------
def gather_papers(contest: dict, runner: ClaudeRunner, *,
                  max_keywords: int = 6, per_source: int = 5,
                  cap: int = 40, from_year: int = 2023,
                  korean_search: bool = False,
                  model: str | None = None) -> list[dict]:
    keywords = (contest.get("search_keywords") or [contest.get("field", "")])[:max_keywords]
    collected: list[dict] = []
    for kw in keywords:
        if not kw:
            continue
        collected += search_arxiv(kw, per_source, from_year)
        collected += search_openalex(kw, per_source, from_year)
        collected += search_crossref(kw, per_source, from_year)
    if korean_search:
        collected += claude_supplement(contest, runner, model=model)

    seen: set[str] = set()
    deduped: list[dict] = []
    for p in collected:
        key = _norm_title(p.get("title", ""))
        if not key or key in seen:
            continue
        seen.add(key)
        deduped.append(p)
    return deduped[:cap]


def save_papers(papers: list[dict], out_dir: Path) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    p = out_dir / "papers.json"
    p.write_text(json.dumps(papers, ensure_ascii=False, indent=2), encoding="utf-8")
    return p
