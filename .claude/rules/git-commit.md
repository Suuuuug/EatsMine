# Git
변경 단위별 검증 뒤 staged diff와 민감 파일, 작업 문서 제외를 확인하고 Conventional Commits로 커밋한다. 사용자 작업을 덮어쓰거나 이력을 강제 변경하지 않는다. Claude 공동 작성자·생성 표기는 넣지 않는다. 외부 공개 및 원격 설정은 사용자 의도를 확인한다.

EatsMine(2026-11-24 갱신): 팀 저장소 기본 브랜치는 `main`(팀원 관리). `main` 직접 커밋 금지, `feat/*`·`fix/*`·`chore/*` 브랜치 → PR. 2026-11-24 사용자 결정 변경: **AI 활용 문서(AGENTS.md, CLAUDE.md, GOAL.md, HANDOFF.md, `.claude/`, `.agents/`, `docs/`, `research/`)도 커밋·push한다(ignore로 막지 않음).** 비밀·개인정보·서명 문서·타인(팀원) 문서, `.claude/settings.local.json`·런타임 파일은 제외. 팀 `.gitignore`가 루트 CLAUDE.md·AGENTS.md를 무시하므로 `git add -f`로 올린다(팀 `.gitignore`는 바꾸지 않음). 커밋 전 `git status --short --untracked-files=all`로 대상을 확인하고 `/usr/bin/grep` 기반 비밀값 검사(셸의 `grep` 함수는 `-r` 결과를 누락한 적 있음)를 통과해야 한다. push는 사용자가 요청한 턴에만. 커밋 전 Codex 반대 리뷰는 `codex-review.md`.

PR 흐름(2026-11-24 사용자 결정): 각자 브랜치에서 작업하고, 끝나면 리뷰어(Suuuuug, peter030125)를 지정해 `main`으로 PR을 올린다. 머지는 리뷰어가 한다. PR에는 코드와 팀 공용 문서(docs/DESIGN.md, docs/plan.md)만 넣고, AI 활용 문서·스킬은 `feat/mypage`에만 둔다. PR 브랜치는 `origin/main`에서 새로 만들어 코드 커밋을 cherry-pick한다. PR 본문에는 바뀐 것, 리뷰 때 볼 것, 확인한 것·못 한 것을 쓰고 Claude 생성 표기는 넣지 않는다.

머지 규칙(2026-11-25 사용자 결정, 예외 없음): PR 머지는 무조건 리뷰어가 한다. Claude는 본인 PR·남의 PR 모두 머지하지 않는다(`gh pr merge`, 머지 API 포함). 사용자가 머지를 시켜도 규칙을 알리고 리뷰어 요청에서 멈춘다. 건너뛰려면 사용자가 PR을 지정해 명시해야 하고 그 한 건에만 적용된다. 되돌리기도 PR로 올려 리뷰어가 머지한다.
