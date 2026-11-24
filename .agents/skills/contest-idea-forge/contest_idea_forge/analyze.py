"""Step 3 (analysis only — Claude): ideate -> verify -> select.

These three functions are the *entire* model-judgment surface of the tool.
Each loads a prompt template, fills in the contest + research context that the
deterministic steps produced, and asks `claude -p` for structured JSON.

  ideate : grounded candidate ideas under the team/demo constraints
  verify : adversarial review of one idea (prior-art / soundness / citations / feasibility)
  select : pick & rank the survivors, explain why, list the rejects
"""
from __future__ import annotations

import json
from pathlib import Path

from .claude_client import ClaudeRunner
from .schemas import IDEA_FIELDS, VERDICT_FIELDS, fields_to_prompt

_PROMPT_DIR = Path(__file__).resolve().parent / "prompts"


def _prompt(name: str) -> str:
    return (_PROMPT_DIR / name).read_text(encoding="utf-8")


def _compact_papers(papers: list[dict]) -> str:
    rows = [
        {"title": p.get("title"), "venue": p.get("venue"),
         "year": p.get("year"), "url": p.get("url")}
        for p in papers
    ]
    return json.dumps(rows, ensure_ascii=False)


def _constraints(team_size: int, include_nonmajor: bool, demo_period: str) -> str:
    lines = [
        f"- 팀 규모: {team_size}인 이하",
        f"- 데모 완성 기간: {demo_period} (그 안에 동작하는 MVP까지)",
        "- 대규모 인프라/대규모 학습 불필요 (사전학습 모델·오픈소스·공개 데이터·API 우선)",
    ]
    if include_nonmajor:
        lines.append("- 팀에 비전공자 1명 이상 포함 — 비전공자가 기여할 구체 역할(기획·UX·도메인 리서치·데이터 라벨링·발표 등)을 명시")
    return "\n".join(lines)


def ideate(contest: dict, papers: list[dict], runner: ClaudeRunner, *,
           n_ideas: int = 3, team_size: int = 4, include_nonmajor: bool = True,
           demo_period: str = "약 2개월", model: str | None = None) -> list[dict]:
    prompt = (_prompt("ideate.md")
              .replace("{{N}}", str(n_ideas))
              .replace("{{CONTEST}}", json.dumps(contest, ensure_ascii=False))
              .replace("{{CONSTRAINTS}}", _constraints(team_size, include_nonmajor, demo_period))
              .replace("{{PAPERS}}", _compact_papers(papers))
              .replace("{{IDEA_FIELDS}}", fields_to_prompt(IDEA_FIELDS)))
    data = runner.run_json(prompt, model=model)
    ideas = data.get("ideas", data) if isinstance(data, dict) else data
    if not isinstance(ideas, list):
        raise ValueError("ideate did not return a list of ideas")
    return ideas


def verify(idea: dict, papers: list[dict], contest: dict, runner: ClaudeRunner, *,
           team_size: int = 4, demo_period: str = "약 2개월",
           allow_web: bool = False, model: str | None = None) -> dict:
    prompt = (_prompt("verify.md")
              .replace("{{IDEA}}", json.dumps(idea, ensure_ascii=False))
              .replace("{{CONTEST}}", json.dumps(contest, ensure_ascii=False))
              .replace("{{PAPERS}}", _compact_papers(papers))
              .replace("{{TEAM_SIZE}}", str(team_size))
              .replace("{{DEMO_PERIOD}}", demo_period)
              .replace("{{VERDICT_FIELDS}}", fields_to_prompt(VERDICT_FIELDS)))
    data = runner.run_json(prompt, model=model, allow_web=allow_web)
    if not isinstance(data, dict):
        raise ValueError("verify did not return a JSON object")
    data.setdefault("idea_title", idea.get("title", ""))
    return data


def select(contest: dict, candidates: list[dict], verdicts: list[dict],
           runner: ClaudeRunner, *, n_select: int = 3,
           model: str | None = None) -> dict:
    prompt = (_prompt("select.md")
              .replace("{{N}}", str(n_select))
              .replace("{{CONTEST}}", json.dumps(contest, ensure_ascii=False))
              .replace("{{CANDIDATES}}", json.dumps(candidates, ensure_ascii=False))
              .replace("{{VERDICTS}}", json.dumps(verdicts, ensure_ascii=False)))
    data = runner.run_json(prompt, model=model)
    if not isinstance(data, dict) or "selected" not in data:
        raise ValueError("select did not return {selected, ...}")
    return data
