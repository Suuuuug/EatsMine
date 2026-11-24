---
name: contest-idea-forge
description: >-
  공모전/경진대회/챌린지 링크 하나로 데모 가능한 프로젝트 아이디어를 도출한다.
  Use when the user provides a contest or competition URL (공모전, 경진대회, 챌린지,
  hackathon, datathon) and wants idea generation — or asks to brainstorm grounded,
  demo-scale, paper-backed project ideas for a competition with a given team size.
  The skill runs a deterministic Python pipeline (fetch → search papers → ideate →
  adversarial verify → select → render); Claude is used ONLY for the analysis steps
  via headless `claude -p`. Do not hand-write ideas yourself — invoke the pipeline.
---

# contest-idea-forge

공모전 링크를 받아 **근거 논문 + 적대적 검증**을 거친 데모 규모 아이디어를 뽑아내는 스킬.
오케스트레이션·논문 수집·렌더링은 코드가 결정적으로 처리하고, 판단(추출/도출/검증/선별)만 Claude가 한다.

## When to use
- 사용자가 공모전/경진대회/챌린지 **링크**를 주고 아이디어를 원할 때.
- "이 공모전에 낼 만한 아이디어 뽑아줘", "팀 N명이 데모할 수 있는 규모로" 같은 요청.

## How to run
요구사항: Python 3.9+, 그리고 인증된 Claude Code CLI (`claude` on PATH). 처음이면 `claude login`.

```bash
# 1. 의존성 (최소)
pip install -r requirements.txt        # pyyaml 1개만

# 2. 실행 — 링크만 주면 끝
python -m contest_idea_forge.run --url "https://<공모전 링크>"

# 자주 쓰는 옵션
python -m contest_idea_forge.run --url "<링크>" \
  --candidates 6 --n-ideas 3 \      # 후보 6개 도출 → 검증 → 최종 3개
  --team-size 3 --demo-period "약 2개월" \
  --korean-search \                  # 국내(KCI 등) 논문 보완 (Claude 웹검색 1콜)
  --no-nonmajor                      # 비전공자 포함 제약 해제
```

빠른 1패스(검증 생략): `--no-verify`. Notion 페이지로도 내보내기: `--notion`
(환경변수 `NOTION_TOKEN`, `NOTION_PARENT_PAGE_ID` 필요).

## What it produces
`out/<공모전-slug>/` 아래:
- `report.md` — 공모전 개요 · 선정 아이디어 표 · 선정 논리 · 폐기 후보 · 참고 논문
- `ideas/idea_NN.md` — 아이디어별 상세(문제·접근·데이터·데모 범위·역할분담·근거 논문·검증)
- `result.json` — 전체 원자료(contest/papers/candidates/verdicts/result)

## Notes for the agent
- 이 스킬은 `claude -p`를 내부에서 호출한다. 즉 분석은 헤드리스 세션이 수행하므로, **직접 아이디어를 작성하지 말고 파이프라인을 돌린 뒤 결과를 사용자에게 요약**하라.
- 사이트가 일반 HTTP를 막아 추출이 비면, 페이지 텍스트를 직접 확보해 `fetch_contest(..., page_text=...)`로 넘기거나 `out/<slug>/contest.json`을 보정한 뒤 이후 단계를 재실행한다.
- 모델은 기본적으로 CLI 기본값을 쓴다. 품질을 높이려면 `--analysis-model opus --extract-model sonnet`처럼 지정.
