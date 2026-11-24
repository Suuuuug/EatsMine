"""Orchestrator CLI — the deterministic spine of contest-idea-forge.

Pipeline:  fetch (1 analysis call) -> search (code+APIs) -> ideate (1) ->
verify (N, parallel) -> select (1) -> render (code).

Usage:
    python -m contest_idea_forge.run --url <contest link> [options]
    contest-idea-forge --url <contest link>   # if installed
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from . import __version__, analyze
from .claude_client import ClaudeRunner, cli_available
from .fetch_contest import fetch_contest, save_contest
from .render import push_notion, render_markdown, save_json
from .search_papers import gather_papers, save_papers


def _load_config(path: str | None) -> dict:
    if not path:
        return {}
    p = Path(path)
    if not p.exists():
        print(f"[config] {path} not found — using defaults/flags.", file=sys.stderr)
        return {}
    try:
        import yaml  # type: ignore
        return yaml.safe_load(p.read_text(encoding="utf-8")) or {}
    except ModuleNotFoundError:
        print("[config] pyyaml not installed — `pip install pyyaml` to use config.yaml.",
              file=sys.stderr)
        return {}


def _slug(name: str) -> str:
    s = re.sub(r"[^0-9A-Za-z가-힣]+", "-", (name or "contest")).strip("-")
    return (s or "contest")[:60]


def build_parser() -> argparse.ArgumentParser:
    ap = argparse.ArgumentParser(
        prog="contest-idea-forge",
        description="공모전 링크 하나로 데모 가능한 아이디어를 뽑아내는 파이프라인 "
                    "(코드 자동화 + 분석만 Claude).",
    )
    ap.add_argument("--url", help="공모전 페이지 링크")
    ap.add_argument("--out", default=None, help="출력 디렉터리 (기본: ./out/<slug>)")
    ap.add_argument("--config", default=None, help="config.yaml 경로")
    ap.add_argument("--candidates", type=int, default=6, help="도출할 후보 아이디어 수")
    ap.add_argument("--n-ideas", type=int, default=3, help="최종 선별 아이디어 수")
    ap.add_argument("--team-size", type=int, default=4, help="팀 인원 상한")
    ap.add_argument("--demo-period", default="약 2개월", help="데모 완성 기간 문구")
    ap.add_argument("--no-nonmajor", action="store_true", help="비전공자 포함 제약 해제")
    ap.add_argument("--no-verify", action="store_true", help="적대 검증/선별 생략(빠른 1패스)")
    ap.add_argument("--korean-search", action="store_true",
                    help="Claude 웹검색으로 국내(KCI 등) 논문 보완")
    ap.add_argument("--from-year", type=int, default=2023, help="논문 최소 연도")
    ap.add_argument("--notion", action="store_true",
                    help="결과를 Notion 페이지로도 생성(NOTION_TOKEN/NOTION_PARENT_PAGE_ID 필요)")
    ap.add_argument("--model", default=None, help="모든 분석 단계 기본 모델 (예: sonnet/opus)")
    ap.add_argument("--extract-model", default=None, help="추출 단계 모델 override")
    ap.add_argument("--analysis-model", default=None, help="도출/검증/선별 모델 override")
    ap.add_argument("--verify-workers", type=int, default=4, help="검증 병렬 워커 수")
    ap.add_argument("--version", action="version", version=f"contest-idea-forge {__version__}")
    return ap


def run(args: argparse.Namespace) -> int:
    cfg = _load_config(args.config)

    def pick(flag, key, default):
        v = getattr(args, flag)
        if v is None:
            return cfg.get(key, default)
        return v

    if not cli_available():
        print("ERROR: `claude` CLI not found. Install Claude Code + `claude login`.\n"
              "       (Anthropic-API backend는 README 참고.)", file=sys.stderr)
        return 2

    extract_model = args.extract_model or args.model or cfg.get("extract_model")
    analysis_model = args.analysis_model or args.model or cfg.get("analysis_model")
    runner = ClaudeRunner()

    print("→ [1/5] 공모전 페이지 추출…")
    contest = fetch_contest(args.url, runner, model=extract_model)
    out_dir = Path(args.out) if args.out else Path("out") / _slug(contest.get("name", ""))
    save_contest(contest, out_dir)
    print(f"    {contest.get('name','(?)')} | 분야: {contest.get('field','')}")

    print("→ [2/5] 분야별 최신 논문 수집…")
    papers = gather_papers(
        contest, runner, from_year=args.from_year,
        korean_search=args.korean_search, model=analysis_model,
    )
    save_papers(papers, out_dir)
    print(f"    논문 {len(papers)}편 확보")

    print(f"→ [3/5] 아이디어 후보 {args.candidates}개 도출…")
    candidates = analyze.ideate(
        contest, papers, runner,
        n_ideas=args.candidates, team_size=args.team_size,
        include_nonmajor=not args.no_nonmajor, demo_period=args.demo_period,
        model=analysis_model,
    )
    print(f"    후보 {len(candidates)}개")

    verdicts: list[dict] = []
    if args.no_verify:
        print("→ [4/5] 검증 생략(--no-verify) — 후보 상위 N개를 그대로 출력")
        result = {
            "selected": candidates[: args.n_ideas],
            "selection_rationale": "검증 비활성화(--no-verify): 도출 순서 상위 N개.",
            "rejected": [],
        }
    else:
        print(f"→ [4/5] 후보별 적대 검증 (병렬 {args.verify_workers})…")

        def _verify_one(idea):
            return analyze.verify(
                idea, papers, contest, runner,
                team_size=args.team_size, demo_period=args.demo_period,
                allow_web=args.korean_search, model=analysis_model,
            )

        with ThreadPoolExecutor(max_workers=max(1, args.verify_workers)) as ex:
            verdicts = list(ex.map(_verify_one, candidates))
        kept = sum(1 for v in verdicts if v.get("verdict") != "kill")
        print(f"    검증 완료 — kill 제외 생존 {kept}/{len(verdicts)}")

        print(f"→ [5/5] 최종 {args.n_ideas}개 선별…")
        result = analyze.select(
            contest, candidates, verdicts, runner,
            n_select=args.n_ideas, model=analysis_model,
        )

    payload = {"contest": contest, "papers": papers,
               "candidates": candidates, "verdicts": verdicts, "result": result}
    save_json(payload, out_dir)
    report = render_markdown(contest, papers, result, verdicts, out_dir)
    print(f"\n✓ 완료 → {report}")
    print(f"  - 개요/선별/논문: {report}")
    print(f"  - 아이디어별: {out_dir / 'ideas'}/idea_*.md")
    print(f"  - 원자료: {out_dir / 'result.json'}")

    if args.notion:
        url = push_notion(contest.get("name", "공모전 아이디어"),
                          report.read_text(encoding="utf-8"))
        if url:
            print(f"  - Notion: {url}")
    return 0


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if not args.url:
        build_parser().print_help()
        return 1
    try:
        return run(args)
    except KeyboardInterrupt:
        print("\n중단됨.", file=sys.stderr)
        return 130


if __name__ == "__main__":
    raise SystemExit(main())
