"""Step 1 (code + 1 analysis call): contest URL -> structured requirements.

Code downloads the page and strips it to readable text. Claude then *analyzes*
that text into the structured fields in `schemas.CONTEST_FIELDS`. The download,
HTML cleanup, and length capping are all deterministic; only the extraction
judgment is delegated to the model.
"""
from __future__ import annotations

import html
import json
import re
import urllib.request
from pathlib import Path

from .claude_client import ClaudeRunner
from .schemas import CONTEST_FIELDS, fields_to_prompt

_UA = "Mozilla/5.0 (compatible; contest-idea-forge/0.1; +https://github.com/pokochy/contest-idea-forge)"
_PROMPT_DIR = Path(__file__).resolve().parent / "prompts"


def _download(url: str, timeout: int = 30) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": _UA})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        raw = resp.read()
    return raw.decode("utf-8", errors="replace")


def _html_to_text(doc: str, max_chars: int = 16000) -> str:
    """Very small readability pass: drop scripts/styles, tags, collapse space."""
    doc = re.sub(r"(?is)<(script|style|noscript|svg)[^>]*>.*?</\1>", " ", doc)
    doc = re.sub(r"(?is)<!--.*?-->", " ", doc)
    doc = re.sub(r"(?is)<br\s*/?>", "\n", doc)
    doc = re.sub(r"(?is)</(p|div|li|tr|h[1-6])>", "\n", doc)
    text = re.sub(r"(?s)<[^>]+>", " ", doc)
    text = html.unescape(text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n\s*\n+", "\n\n", text).strip()
    return text[:max_chars]


def _load_prompt() -> str:
    return (_PROMPT_DIR / "extract.md").read_text(encoding="utf-8")


def fetch_contest(url: str, runner: ClaudeRunner, *,
                  model: str | None = None,
                  page_text: str | None = None) -> dict:
    """Return a dict matching CONTEST_FIELDS for the contest at `url`.

    `page_text` lets callers pass pre-fetched text (e.g. when a site blocks
    plain HTTP and the page was grabbed another way).
    """
    if page_text is None:
        page_text = _html_to_text(_download(url))
    prompt = (
        _load_prompt()
        .replace("{{URL}}", url)
        .replace("{{FIELDS}}", fields_to_prompt(CONTEST_FIELDS))
        .replace("{{PAGE_TEXT}}", page_text)
    )
    data = runner.run_json(prompt, model=model)
    if not isinstance(data, dict):
        raise ValueError("extract step did not return a JSON object")
    data.setdefault("source_url", url)
    return data


def save_contest(data: dict, out_dir: Path) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    p = out_dir / "contest.json"
    p.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return p
