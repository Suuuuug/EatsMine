# Codex 반대 리뷰

2026-11-24 사용자 지시: 디자인 평가와 코드 리뷰는 Codex에 맡기고, 진행은 사용자가 모두 승인했다(묻지 않고 진행, 비가역·외부 발송만 먼저 알림).

의미 있는 변경 단위(설정·구조·기능·스키마·연동)는 커밋 전에 Codex 반대 리뷰를 거친다. 모델은 `gpt-6.1-sol`(2026-11-23 사용자 지정). 사용자가 다른 모델을 지시하면 그걸 따른다.

## 실행

플러그인 런타임 경로: `~/.claude/plugins/cache/openai-codex/codex/<버전>/scripts/codex-companion.mjs`(2026-11-23 기준 1.0.6). 두 모드 모두 Codex 샌드박스는 읽기 전용이다.

- git이 보는 변경(추적 파일·미추적 파일)은 adversarial-review로 리뷰한다.
  `node "$CODEX" adversarial-review --wait --model gpt-6.1-sol --scope working-tree "<집중할 질문>"`
  브랜치 전체는 `--base main`. 크기가 크면 `--wait` 대신 Bash 백그라운드로 실행한다.
- adversarial-review는 git이 무시하는 파일(`.gitignore`, `.git/info/exclude`)을 보지 않는다. 로컬 전용인 AGENTS.md·`.claude/`·`.agents/`·`docs/`를 리뷰하려면 task 모드(`--write` 없이)로 경로를 명시한다.
  `node "$CODEX" task --model gpt-6.1-sol --effort high "<읽을 파일 목록과 반대 리뷰 관점>"`
- 위임·리뷰 프롬프트 본문에 꺾쇠 태그 같은 함수호출 유사 텍스트를 넣지 않는다.

## 결과 처리

- 실행 결과(완료 출력이나 job id)를 확인한 뒤에만 "리뷰했다"고 말한다. 실패하면 실패 사유를 그대로 보고한다.
- 지적마다 근거를 직접 확인한다(실행 재현 또는 명확한 정적 근거). 맞으면 반영하고 영향받은 검사를 다시 돌리며, 반영하지 않으면 이유를 daily-log에 적는다. Codex 결과를 검증 없이 사실로 옮기지 않는다.
- 리뷰 모델·범위·주요 지적과 처리 결과를 daily-log에 기록한다.
