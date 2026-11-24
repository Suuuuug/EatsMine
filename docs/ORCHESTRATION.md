# 오케스트레이션: 메인 · 서브에이전트 · Codex

grad-eval-agent와 같은 하네스 구조다. 근거와 원칙은 `docs/HARNESS.md`. **메인 에이전트(Claude Code 세션)는 결정과 수정만 하고, 읽고 분석하고 초안 쓰는 일은 서브에이전트에 나눈다.** 같은 파일을 동시에 고치지 않고, 검토는 만든 쪽과 다른 눈(서브에이전트, 다른 모델 Codex)이 한다.

| 역할 | 정의 | 모델 | 쓰기 권한 |
|---|---|---|---|
| 메인 | 이 세션 | 세션 모델 | 저장소 전체 (규칙 범위 안) |
| `skill-eval-runner` | `.claude/agents/skill-eval-runner.md` | sonnet | 지정 outputs 폴더만 |
| `code-reviewer` | `.claude/agents/code-reviewer.md` | sonnet | 없음 (읽기 전용) |
| `ui-evaluator` | `.claude/agents/ui-evaluator.md` | sonnet | 없음 (실행 중 앱을 Playwright로 조작·판정) |
| `contest-monitor` | `.claude/agents/contest-monitor.md` | sonnet | 없음 (보고만) |
| Codex 반대 리뷰 | `.claude/rules/codex-review.md` | `gpt-6.1-sol` | 없음 (읽기 전용 샌드박스) |

## 기능 개발 루프

```
[메인] eatsmine-product-spec로 범위 확인 → docs/plans/active/<기능>.md에 완료 계약 작성(_TEMPLATE.md)
   │
   ├─ 구현 ──────────────────────────────────────────────
   │  [메인] 테스트 먼저(test-driven-development) → 구현 → 빌드·테스트
   │  [병렬] [서브: ui-evaluator] 계약 기준으로 실행 중 앱 판정 (UI 변경 시)
   │         [서브: code-reviewer] diff 1차 검토
   │         [Codex: adversarial-review --model gpt-6.1-sol] 설계·가정 반대 검토
   │  [메인] 실행 재현 또는 명확한 정적 근거로 확인된 지적을 반영. 미확인 의심은 따로 기록
   │  [메인] 반영 후 영향받은 검사(lint·build·테스트·ui-evaluator)를 **다시** 돌린다. 이전 통과 결과는 수정 뒤 무효
   └────────────────────────────────────────────────────
   │
[메인] 계약 파일에 결과·다음 단계 기록 → 끝났으면 docs/plans/completed/로 이동
[메인] daily-log · HANDOFF 갱신 → 코드만 커밋 (push는 사용자 지시 때만)
```

## 스킬 검증 루프 (skill-creator)

```
[메인] SKILL.md 초안·수정, evals/<case>/ 작성 (함정형 프롬프트 2~3개)
   │  고칠 때는 이전 판을 workspace/skill-snapshot/으로 떠 둔다
   ├─ [서브: skill-eval-runner × (케이스 수 × 2), 병렬]
   │     with_skill / without_skill(새 스킬) 또는 old_skill(개선)
   │     결과: <스킬>-workspace/iteration-N/<case>/<구성>/outputs/
   ├─ [메인] 채점(grading.json: text·passed·evidence) → aggregate_benchmark → eval-viewer 생성
   ├─ [사용자] viewer에서 결과 보고 피드백
   └─ [메인] 피드백으로 스킬 수정 → iteration-N+1
```

workspace는 세션 scratchpad에 둔다. 케이스 폴더(`evals/`)는 스킬과 함께 **로컬에만** 보관한다(`.agents/`는 커밋하지 않음).

## 공모전 판세 루프 (매일 14시 이후)

```
[서브: contest-monitor] 대시보드 판독 → 보고
[메인] daily-log에 순위 기록 → WINNING-STRATEGY.md 목표·판세 표 갱신 → 우선순위 조정 제안
```

## 작업 크기에 따른 강도

- 작은 변경(문구, 스타일, 단일 컴포넌트): 메인이 직접 읽고 구현, lint·build와 필요 시 ui-evaluator만.
- 잇플 링크·데이터, 인증·권한, DB 스키마, 배포 설정: code-reviewer + Codex 반대 리뷰 + ui-evaluator 전부.
- 이 구분은 Anthropic 원문 후반(모델이 충분히 처리하는 작업에서 평가자는 비용)에 따른 팀 선택이다(`docs/HARNESS.md`).

## 메모

- 이 세션 중에 새로 만든 `.claude/agents/` 정의는 다음 세션부터 Agent 도구의 subagent_type으로 바로 잡힌다. 같은 세션에서는 general-purpose 에이전트에 정의 파일 내용을 지시로 넘겨 같은 역할을 시킨다.
- 서브에이전트 결과는 메인이 검증한 뒤에만 사실로 옮긴다. Codex 결과도 같다.
