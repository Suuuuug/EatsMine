# 디자인 시스템·스타일 가이드 — 작업 계약

- 기획서 항목: 공통 UI(§8 접근성, §11 화면), 사용자 지시 2026-11-24
- 브랜치: feat/mypage (사용자 지시로 같은 브랜치에 커밋·push)
- 담당: 메인(구현) / Codex gpt-6.1-sol(반대 리뷰·디자인 평가·추가 이미지 제작)

## 사용자 지시 (2026-11-24)
- eatsmine-svg-kit.zip을 풀어 알맞은 위치에 배치, zip은 정리.
- /styleguide를 키트 기반으로, 왼쪽 메뉴 사이드바 구조로 다시 구성. 토스 TDS 방식, AI 티 없는 다양한 컴포넌트.
- DESIGN.md·tokens.css·디자인 가이드를 Claude 디자인(Design System 아티팩트)과 함께 만들어 올림.
- AI 활용 문서(AGENTS·CLAUDE·GOAL·HANDOFF·.claude·.agents·docs·research)도 ignore로 막지 말고 커밋·push.
- 추가로 필요한 SVG·이미지는 Codex로 같은 화풍으로 만들고 확인.
- 백엔드는 Next.js로 하기로 함. 이번엔 프론트 디자인만.

## 완료 기준
1. 키트 자산이 `apps/web/public/images/{maps,markers,badges,foods,illustrations,seasons}`에 있고, UI 아이콘은 `scripts/icons/*.svg` → `build-icons.mjs` → 단일 스프라이트로 합쳐져 `<Icon name>`으로 쓸 수 있다.
2. `apps/web/src/styles/tokens.css`가 em-theme 색·지도 색·모서리 토큰의 한 곳이고, 화면 파일에 hex가 없다(SVG 자산 제외).
3. `/styleguide` 390/768/1440에서 가로 넘침 없음. 1024px 이상은 왼쪽 고정 사이드바, 그 아래는 메뉴 버튼으로 여는 서랍. 사이드바 링크를 누르면 해당 구역으로 이동하고 현재 구역이 표시된다(aria-current).
4. 컴포넌트마다 실제로 조작되는 예시(버튼 상태, 입력 오류, 스위치·체크·세그먼트·칩 선택, 토스트, 바텀시트 열고 Esc로 닫기, 영토 지도 시도→영토 선택)와 사용 규칙 한 줄, 코드 한 줄.
5. DESIGN.md §1 금지 목록(eyebrow, 이모지, 장식 칩, 한쪽 굵은 테두리, 그라데이션 글자 등) 위반 0.
6. `npm run lint`, `npm run build` 통과. Codex 반대 리뷰 지적 검증 후 반영.

## 범위 밖
- 실제 카카오맵 연동, 정식 경계(rebuild_maps.py 실행), /my 화면 변경, 팀 `components/ui`·`globals.css` 수정, 백엔드.

## 검증 기록

| 검증 대상(커밋/상태) | 명령·시나리오 | 결과 | 근거 | 미검증 |
|---|---|---|---|---|
| 작업 트리(커밋 전) | `npm run lint`, `npm run build -w web` | 통과 | /styleguide 정적 생성 포함 9개 라우트 | — |
| 작업 트리 | `tsc --noEmit` + SearchField `onSubmit={(value: string) => …}` 가상 호출부 | 통과 | Codex 지적 수정 후 | — |
| 작업 트리 | Playwright 390: 하단 탭 바 EatsMine → 영토 지도 제목 포커스, 칩 줄 도감 aria-current, 스크롤 시 탭 따라감, 탭 95×64, 토스트 탭 바 위, 가로 넘침 없음 | 통과 | .playwright-mcp/m-tab-*.png | 768px, 실기기 |
| 작업 트리 | Playwright 390: 도감 겨울 → "방어" 검색 → 상세 시트 → `/?food=yellowtail` 링크 → Esc 닫힘 → 없는 음식 빈 화면 | 통과 | m-sheet.png | — |
| 작업 트리 | Playwright 390: 영토 지도 서울 진입(제목 포커스) → 종로구 aria-pressed → 전국 복귀, 토스트, 스위치, 닉네임 오류 aria-invalid | 통과 | m-territory.png | 정식 경계, 카카오 지도 |
| 작업 트리 | Playwright 1440: 사이드바, 밝게/어둡게 색 표 두 열, 어둡게 전환, 재질 견본, 팀 공통 UI(team-theme) | 통과 | sg-color.png, d-dark.png, d-team-ui.png | 독립 평가자 점수 |
| 작업 트리 | /my/preview 회귀(콘솔 오류·가로 넘침) | 오류 0, 넘침 없음 | my-preview.png | 시각 비교 점수 |

## 진행 로그
- 2026-11-24: 계약 작성, 키트 내용·안전성 확인(스크립트·외부 참조 없음).
- 키트 배치: public/images/{maps,markers,badges,foods,illustrations,seasons}. UI 아이콘 28개는 scripts/icons → build-icons.mjs로 기존 6개와 합쳐 단일 스프라이트 34개(선 1.75 통일, 겹치는 chevron-right·share·lock·dictionary 제외), `iconNames` 배열 생성. 지도 재생성 스크립트 scripts/maps/rebuild_maps.py(경로 수정), kakao-territory.ts는 src/lib/map에 타입 정리(any 제거, 미리보기 경계 거부, 색은 인자로).
- tokens.css 신설(em-theme 토큰 이전 + line·fill·accent-weak·danger·map-*·radius-sheet·shadow-float, team-theme, prefers-contrast). components.css에 material-sidebar·material-thick·field·focus-ring·em-dialog.
- @/components/em 부품 19개, catalog.ts. List의 스위치는 SwitchTrack 공유.
- /styleguide 재구성: 1024px 이상 macOS 사이드바, 미만은 하단 유리 탭 바(4묶음) + 상단 칩 줄(사용자 지시로 햄버거·서랍 제거, 성대공지 구조). 밝기 세그먼트는 상단 바. 구역 18개, 도감은 기획서 /dictionary 흐름.
- Codex 설계 반대 리뷰 12건 확인·반영(light-dark 그림자 문법, 44px, 서랍 포커스, 지도 path 탭 순서 제외, 오류+포커스 동시 표시, team-theme 분리, 유리 공통 대체 등).
- Codex 일러스트 3종(empty-search, empty-reviews, load-error) 제작 → sharp 나란히 렌더로 화풍 일치 확인.
- HIG·Material 3·SEED 원문 확인 후 규칙 반영(FilterChip 낮은 주목도, 토스트 4초, 세그먼트 조작 전용).
- Codex 적대 리뷰(working-tree): SearchField onSubmit 타입 충돌, Switch 28px·지우기 36px·세그먼트 40px 누름 영역 → 모두 수정.

## 진행 로그(이어서, 2026-11-24)
- 사용자 지시 반영: 모바일 햄버거·서랍 제거 → 하단 유리 탭 바(4묶음) + 상단 칩 줄. 밝기 전환은 상단 바에서 빼서 사이드바 아래와 '색' 구역 안으로.
- 브랜드 아이콘: 박스 유무를 독립 평가자(design-auditor)에게 결론 없이 비교시켜 박스형(B) 선택(위계·macOS 관례, 박스 없는 쪽은 탭 아이콘과 겹침). 꾸밈 색 상자가 아니라 파비콘과 같은 앱 아이콘 타일(app/icon.svg)로 통일. 탭 바 EatsMine 묶음 아이콘은 map으로 분리.
- ui-evaluator(390/768/1440): 넘침·탭/칩·조작 예시·키보드 고리·콘솔 오류 0 통과. F1(페이지 끝 구역 aria-current) → 스크롤 위치 계산 + 마지막으로 누른 구역 유지로 수정. F3(시트 반투명) → 원인은 열림 애니메이션의 opacity가 멈춘 환경에서 남는 것, 애니메이션을 위치만 움직이게 수정 + 재질 92%.
- design-auditor: 390 종합 7, 1440 종합 8(캡처 일부가 동시 실행된 평가자 때문에 다른 폭으로 섞임). 반영: 규칙 점 제거, 예시 라벨 본문색, 빈 화면 6카드 반복 → 큰 예시 1 + 문구 목록.
- Codex HIG·토스 검토 11건 모두 반영: 도감 빈 결과 문구·조건 초기화, 눌리지 않던 span 버튼 → 실제 버튼·링크, 탭 바 묶음별 마지막 위치 기억, 대비 높이기 재질(glass-bar·material-thick), 출처 링크 44px 줄, 스위치 눌림 반응, 도감 계절 5개 → 단일 선택 칩, 비활성 이유 문구, '잇플에서 상세 보기', 빈 화면 문구 축약, 구역 규칙 2줄 이내.
- 보안 검토 경고(contest-idea-forge의 claude -p에 웹 텍스트 전달): --tools ""/WebSearch·WebFetch + --strict-mcp-config로 제한, CLI 실행 확인(b89f889).
- 아티팩트(비공개, 팀 공유는 Share 메뉴): Claude Design System https://claude.ai/artifact/CfahhRk5J9p868swYuryLN (토큰·브랜드 북·컴포넌트 7·자산 37), 팀 프로토타입 https://claude.ai/artifact/7Cvg9h1TC2GvMz2irkEBrX (지도·도감·마이 흐름, 예시 데이터).
- lint/build 통과(수정 후 재실행).

## 결정
- 팀 `components/ui`·`globals.css`는 고치지 않는다. 앱 화면 부품은 `components/em`, 팀 ui는 팀 소개·마케팅용.
- 유리는 떠 있는 층에만(HIG Materials), 바탕 빛번짐 한 겹은 사용자 지시로 허용.
- 백엔드 방식 미정 → 부품은 props만 받는다.
- 지도 경계는 미리보기(preview-approximate)라 화면에 "단순화한 예시"와 출처를 표시.

## 다음 단계
- 커밋·push(메인), Claude Design System 아티팩트 채우기, 팀 공유용 프로토타입 HTML.
- 768px·실기기 확인, 독립 평가자(design-auditor) 점수.
