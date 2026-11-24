# 하네스 엔지니어링 — EatsMine 적용 원칙

조사일 2026-11-24. "하네스"는 모델 바깥의 환경, 곧 에이전트가 보는 문서, 막는 규칙, 확인하는 루프, 고치는 절차를 말한다. 2주짜리 학생 팀 규모에 맞게 줄여 적용한다. 인용은 원문 일부이고, "적용"은 우리 판단이다.

## 출처
- OpenAI, [Harness engineering: leveraging Codex in an agent-first world](https://openai.com/index/harness-engineering/) (2026-02-11)
- Anthropic, [Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps) (2026-03-24)
- Software Mansion, [Harness engineering](https://agentic-engineering.swmansion.com/becoming-productive/harness-engineering/)
- 우리 팀 선례: `grad-eval-agent`(메인=결정·수정, 서브=읽기·분석, `docs/ORCHESTRATION.md`)

## 원칙과 적용

| 원칙 | 출처 근거 | EatsMine 적용 |
|---|---|---|
| AGENTS.md는 백과사전이 아니라 지도 | OpenAI "give Codex a map, not a 1,000-page instruction manual", 약 100줄 목차 | AGENTS.md를 약 70줄 지도로 줄이고 세부는 docs·스킬·rules로 |
| 지식은 저장소 안에 | OpenAI "Plans are treated as first-class artifacts", 진행·결정 로그를 저장소에 | 기획서를 `docs/plan.md`로, 작업 계약을 `docs/plans/active/`에. 단 우리 결정으로 로컬 전용(팀 공유는 Google 문서·PR 설명) |
| 기계적 강제 | OpenAI 커스텀 린트가 "remediation instructions"를 에이전트에 주입, 구조 테스트 | **현재는 명령 기반 검증이고 실행은 절차로 보장한다**(ESLint·oxlint·build를 커밋 전에 돌리라는 규칙). 일반 린터는 merUrl 무변형·저장 금지를 잡지 못한다. 핵심 불변조건 단위 테스트를 추가한 항목만 기계적으로 강제된다고 본다 |
| 생성자와 평가자 분리 | Anthropic "Separating the agent doing the work from the agent judging it proves to be a strong lever", 평가자가 Playwright로 실행 중인 앱을 직접 조작. 단 같은 글 후반은 모델이 좋아지자 스프린트를 없애고 평가를 마지막 한 번으로 줄였고, 모델이 충분히 하는 작업에서는 평가자가 비용이라고 했다 | `ui-evaluator`, `code-reviewer`, Codex(`gpt-6.1-sol`). 세 겹 리뷰는 원문이 요구한 게 아니라 **팀 선택**이다. 작은 작업은 메인이 직접 하고, 잇플·인증·스키마·배포 변경에 리뷰를 집중한다 |
| 완료 계약을 먼저 | Anthropic 스프린트 전 생성자·평가자가 "sprint contract"로 완료 정의를 합의 | `docs/plans/active/<기능>.md`에 테스트 가능한 완료 기준을 먼저 쓰고 평가자가 그 기준으로 판정 |
| 세션 간 인수인계 | Anthropic 이전 상태와 다음 단계를 담은 구조화된 handoff | HANDOFF.md, daily-log, `session-handoff` 스킬 |
| 작게 쪼개기 | OpenAI "breaking down larger goals into smaller building blocks" | 기능 하나 = 라우트 하나·테이블 하나·테스트 하나의 수직 조각 |
| 꾸준한 정리 | OpenAI "doc-gardening" 에이전트, 기술 부채를 작게 자주 | 주 1회 문서·스킬과 실제 코드 대조(지금은 수동, 필요해지면 /schedule) |
| 도구는 적게 | SW Mansion: MCP가 많으면 에이전트가 덜 유능해진다, GitHub MCP보다 `gh` CLI | GitHub 작업은 `gh`. 브라우저 검증은 Playwright 하나 |
| 하네스는 모델 한계에 대한 가정 | Anthropic "every component in a harness encodes an assumption about what the model can't do on its own" | 쓸모없어진 단계는 지운다. 단계마다 왜 있는지 이 표로 설명 가능해야 한다 |

## 하지 않는 것
- 대규모 사례(수백만 줄, 6시간 단일 실행, 에이전트 간 자동 PR 머지)를 그대로 따라 하지 않는다. 팀원 리뷰는 유지한다.
- 검증 안 된 수치(벤치마크 개선률 등)를 근거로 쓰지 않는다. 위 표는 원문에서 확인한 문장만 인용했다.
- Anthropic의 "Effective harnesses for long-running agents"는 이번에 읽지 않았다.
