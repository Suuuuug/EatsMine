# 프로젝트 작업 지침 — EatsMine

BC카드 eat.pl 잇플 수익화 챌린지 참가 서비스. 이 파일은 **지도**다. 세부는 아래 링크로 내려간다(하네스 원칙: `docs/HARNESS.md`). 준비 단계 기록은 `bccard-eatpl-challenge` 폴더에서 2026-11-23 옮겨 왔다.

## 시작할 때 읽는 순서
1. GOAL.md → HANDOFF.md(재개 지점) → `docs/plans/active/`(진행 중 작업 계약)
2. 무엇을 만들지: `docs/plan.md`(기획서 v2.0, 원본은 팀 Google 문서) + `eatsmine-product-spec` 스킬
3. 대회 조건·전략: `docs/CONTEST.md` 상단, `docs/WINNING-STRATEGY.md`, `docs/BLOCKERS.md`
4. 누가 무엇을 하나: `docs/ORCHESTRATION.md`
5. `git status`, 현재 브랜치, `git log origin/main -5`(팀원 push 확인)

**담당(2026-11-24)**: 이 작업자는 **마이페이지(`/my`)** 담당이다. 도감(`/dictionary`)·지도(홈 `/`)는 다른 팀원 몫이므로 그 페이지와 공통 UI(`apps/web/src/components/ui`)를 고쳐야 하면 먼저 사용자에게 알린다.

최종 판단 기준(기획서 §18): 사용자가 음식·지역을 더 쉽게 발견하고 자연스럽게 잇플 상세로 가도록 돕는가. 전략 문서의 제안은 팀 결정 전까지 제안이다. 순 사용자는 **등록 완료일부터** 집계되므로 등록을 늦추는 작업 순서는 피한다.

## 저장소 구조 (팀 main, 2026-11-23 b22e04b)
```
apps/web   Next.js 16 (App Router, Tailwind 4, cacheComponents) — npm run dev:web → :3000
apps/api   NestJS 12 + Drizzle + pg(Supabase Postgres) — npm run dev:api → :4000
package.json  npm workspaces. npm run dev(둘 다) / build / lint / db:generate·migrate·studio
```
- 공통 UI는 `apps/web/src/components/ui`, 확인 페이지는 `/styleguide`.
- **Next 16은 학습 데이터와 다르다.** 코드를 쓰기 전에 `apps/web/node_modules/next/dist/docs/`(또는 루트 `node_modules/next/dist/docs/`)의 해당 가이드를 읽는다. `next dev`가 `apps/web/AGENTS.md`를 자동 생성한다(팀 .gitignore 대상).
- 잇플·카카오 등 외부 API 호출과 키는 `apps/api`에서만. 웹은 `NEXT_PUBLIC_API_URL`로 우리 API만 부른다. API 전역 접두사는 아직 없다(`/`가 hello). 경로·접두사는 첫 API 작업 계약에서 확정한다.
- API는 `DATABASE_URL`(postgres 계정)로 DB에 붙으므로 **Supabase RLS가 보호해 주지 않는다.** 본인 데이터 접근 제한은 NestJS 계층에서 검사한다. API는 ESM이라 상대 import에 `.js`를 붙인다. 스키마는 `apps/api/src/db/schema.ts` → `npm run db:generate`·`db:migrate`.
- 웹 스타일은 `apps/web/src/app/globals.css`의 `@theme` 토큰만 쓴다(hex 직접 금지, 팀 규칙). 공통 UI는 `@/components/ui`를 먼저 재사용한다.
- 기획서 §9(Next BFF 권장)와 달리 팀이 NestJS를 택했다. 새 프레임워크·서버·패키지 매니저는 먼저 묻는다.
- **백엔드 방식은 미정(2026-11-24 사용자: 백엔드 개발자가 정함).** 프론트 부품은 데이터를 props로만 받아 백엔드와 무관하게 둔다.
- 디자인 시스템: 토큰 `apps/web/src/styles/tokens.css`, 앱 부품 `@/components/em`, 예시 `/styleguide`, 규칙 `docs/DESIGN.md`, Claude Design System https://claude.ai/artifact/CfahhRk5J9p868swYuryLN.

## 절대 규칙
- merUrl은 응답값 그대로 사용자 브라우저에서 연다. 쿼리 추가·단축·중간 리다이렉트·서버 호출 금지. 클릭 기록 실패가 이동을 막지 않는다. 세부: `eatpl-integration` 스킬.
- 잇플 응답은 약관 확인 전까지 영속 저장·캐시·원문 로그 금지. AI는 질의를 검색 조건으로 바꾸기만 하고 식당·순위·시간을 생성하지 않는다(기획서 §7).
- 비밀·개인정보·서명 문서·API 응답 원본을 커밋·출력하지 않는다. 대량 수집·스크래핑·제한 우회·부정 유입 금지. 무료 여부가 불확실한 유료 리소스는 만들지 않는다.
- 사용자 승인 없는 배포·신청·결제·외부 발송 금지. 다른 저장소·계정은 수정하지 않는다. 팀원 코드는 고치기 전에 사용자에게 알린다.

## Git
- 저장소 https://github.com/Suuuuug/EatsMine (공개, 기본 브랜치 `main`, 팀원이 관리). `main` 직접 커밋 금지, `feat/*`·`fix/*`·`chore/*` 브랜치 → PR.
- **PR 흐름(2026-11-24 사용자 결정)**: 각자 브랜치에서 작업 → 끝나면 리뷰어를 지정해 `main`으로 PR(`gh pr create --reviewer Suuuuug,peter030125`) → **머지는 리뷰어가 한다(우리가 머지하지 않음)**. PR에는 코드와 팀 공용 문서(`docs/DESIGN.md`, `docs/plan.md`)만 넣는다. AI 활용 문서·스킬(AGENTS·CLAUDE·GOAL·HANDOFF·`.claude/`·`.agents/`·`research/`·작업 기록)은 본인 작업 브랜치 `feat/mypage`에만 두고 `main`에 넣지 않는다. 그래서 PR은 `main`에서 새 브랜치를 만들어 코드 커밋을 cherry-pick해 올린다(예: PR #1 `feat/mypage-design-system`).
- **머지 규칙(2026-11-25 사용자 결정, 예외 없음)**: PR 머지는 **무조건 리뷰어(Suuuuug, peter030125)가 한다.** 우리 쪽(Claude 포함)은 본인 PR이든 남의 PR이든 `gh pr merge`·머지 API·웹 머지 버튼을 쓰지 않는다. 사용자가 "머지해줘"라고 해도 이 규칙을 알리고, 리뷰어에게 머지를 요청하는 데서 멈춘다. 이 규칙을 건너뛰려면 사용자가 그 PR을 지정해 "규칙을 건너뛰고 머지"라고 명시해야 하며, 그 승인은 해당 PR에만 적용되고 다음에는 이어지지 않는다. 되돌리기(revert)도 PR로 올리고 리뷰어가 머지한다.
- **AI 활용 문서도 커밋·push한다(2026-11-24 사용자 결정 변경, ignore로 막지 않음).** 대상: AGENTS.md, CLAUDE.md, GOAL.md, HANDOFF.md, `.claude/`, `.agents/`, `docs/`, `research/`. 단 비밀·개인정보·서명 문서·타인(팀원) 문서는 제외하고, 커밋 전 `/usr/bin/grep` 비밀값 검사를 한다. 팀 `.gitignore`가 루트 CLAUDE.md·AGENTS.md를 무시하므로 `git add -f`로 올린다(팀 `.gitignore`는 바꾸지 않는다). `.claude/settings.local.json`·런타임 파일은 계속 제외.
- push는 사용자가 요청한 턴에만. `--force`·이력 재작성 금지. Conventional Commits. Claude 공동 작성자·생성 표기를 넣지 않는다. 세부: `.claude/rules/git-commit.md`.

## 개발 루프와 검증 (세부: `docs/ORCHESTRATION.md`, `docs/HARNESS.md`)
- 기능 하나 = 작은 수직 조각 하나(라우트 하나, 테이블 하나, 테스트 하나). 시작 전 `docs/plans/active/<기능>.md`에 완료 계약(테스트 가능한 기준)을 쓰고, 끝나면 진행 로그와 다음 단계를 갱신한다.
- 테스트 먼저(`test-driven-development`). 커밋 전 `npm run lint`, `npm run build`, 해당 워크스페이스 테스트(`npm test -w api` 등)를 돌리고 결과를 적는다.
- UI는 만든 쪽과 다른 평가자(`ui-evaluator` 서브에이전트)가 실행 중인 앱을 Playwright로 390/768/1440px에서 조작해 확인한다. 상태 코드만으로 화면을 검증했다고 하지 않는다.
- 커밋 전 `code-reviewer` 서브에이전트와 Codex 반대 리뷰(`gpt-6.1-sol`, `.claude/rules/codex-review.md`). 실행 재현 또는 명확한 정적 근거로 확인된 지적을 반영하고, 반영 후 영향받은 검사를 다시 돌린다. 미확인 의심과 반영하지 않은 이유는 daily-log에. 작은 변경은 리뷰 강도를 낮춘다(`docs/ORCHESTRATION.md`).
- 라이브러리·API는 context7 또는 공식 문서로 확인한다. 추측하지 않는다. 검증 못 한 것은 못 했다고 적는다.
- 작업 단위가 끝나면 daily-log, 계획, HANDOFF를 갱신한다(`session-handoff` 스킬).

## 스킬과 서브에이전트
- 스킬 정본 `.agents/skills/`(Claude는 `.claude/skills/` 심볼릭 링크). 새 스킬·수정은 skill-creator로 만들고 `evals/`로 검증한다.
- 프로젝트 스킬: `eatsmine-product-spec`, `eatpl-integration`, `eatpl-contest-guide`, `session-handoff`. 화면: `eatsmine-ui-design`, `toss-ux-design`, `toss-ux-writing`, `ui-review-loop`(정본 `docs/DESIGN.md`). k-skill 고정본: `bccard-eatpl-search`, `kakao-map`, `korean-privacy-terms`, `korean-holiday-calendar`, `kamis-food-price`, `korean-humanizer`, `korean-spell-check`. 범용: `test-driven-development`, `systematic-debugging`(obra/superpowers, Python 예시는 TS로 바꿔 읽기).
- 서브에이전트 정의 `.claude/agents/`: `skill-eval-runner`, `code-reviewer`, `ui-evaluator`, `design-auditor`, `contest-monitor`.
