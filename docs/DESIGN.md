# DESIGN — EatsMine 화면 디자인 정본

웹(`apps/web`) 화면의 기준이다. 코드보다 이 문서가 먼저다. 문구 규칙은 `toss-ux-writing` 스킬, 검사 절차는 `ui-review-loop` 스킬, 화면별 적용은 `eatsmine-ui-design` 스킬.

**판단 순서**: 사용자 지시 > 팀 토큰·공통 컴포넌트(`apps/web/src/app/globals.css`, `@/components/ui`, 팀원 소유) > 이 문서의 금지 목록 > 토스·당근 관행 > 개인 취향.

## 1. 사용자가 싫어하는 것 (반려 사유)

2026-11-24 사용자 지시와 이전 프로젝트(WhaleExtentions, skku-notice-alert)에서 사용자가 직접 지목한 것.

- **쓸데없는 회색 설명 글자.** 제목마다 붙는 회색 부연, 이미 보이는 것을 다시 설명하는 캡션. 설명은 헷갈리는 곳 한 군데에만 한 줄.
- **쓸데없는 상태 칩.** "NEW", "진행 중", "공개" 같은 알약 모양 장식. 상태는 문장이나 행 안의 글자로 쓴다. 칩은 사용자가 누르는 필터일 때만.
- **한쪽만 굵은 테두리.** `border-left`/`border-right` 2px 이상 강조색. 테두리는 사방 같은 1px만.
- 그 밖의 AI 티 (출처: jungrok5/ai-design `polish-ui`, Claude 디자인 가이드, 이전 프로젝트 DESIGN.md)
  - 제목 위 작은 대문자 라벨(eyebrow), 영어 ALL-CAPS 라벨, 순서가 아닌 곳의 01/02/03
  - 히어로 아래 "큰 숫자 + 작은 라벨" 통계 타일 띠. 숫자가 페이지의 요점일 때만, 그것도 문장이나 한 줄로
  - 같은 폭·같은 모양 카드 3장 반복, 섹션마다 같은 틀(아이콘+제목+설명), 카드 안의 카드
  - 이모지 아이콘·이모지 제목, 아이콘 세트 섞기, 색 원 안의 아이콘
  - 보라·남색 그라데이션, 글자 그라데이션, 글로우, 장식용 blur 추가
    - 예외(2026-11-24 사용자 지시 "그라데이션·글래스모피즘, iOS랑 맥 기반 웹사이트"): 화면 바탕 한 겹의 옅은 빛번짐(브랜드 녹색·음식 호박색 radial-gradient)과 떠 있는 층(사이드바·상단·하단 바·시트·토스트)의 유리 재질은 허용. 글자·버튼·카드 그라데이션, 보라·남색, 장식용 유리 조각·블롭은 여전히 금지.
  - 링크·버튼 끝 "→", "A · B · C" 메타 문자열, "WORD — 조각" 라벨
  - 지어낸 수치·후기, "혁신적인", "인사이트" 같은 빈 말
  - 바운스·펄스·페이드업 애니메이션, `transition: all`

## 2. 토큰을 쓰는 법

색·모서리·그림자는 토큰 이름만 쓴다(hex 직접 금지, 팀 규칙). **유일한 정의 위치는 `apps/web/src/styles/tokens.css`**(components.css 맨 위에서 import). 팀 기본 값은 `globals.css @theme`(팀원 소유), EatsMine 화면은 `.em-theme` 범위에서 OKLCH `light-dark()`로 밝게·어둡게를 한 줄에 정의한다(`data-scheme="light|dark"`로 고정 가능). `.team-theme`는 em-theme 안에서 팀 기본 테마를 그대로 보여 주는 미리보기용.

| 토큰 | 쓰임 |
|---|---|
| `background` | 화면 바탕 |
| `surface` | 한 단계 올라온 면, 시트 안, 예시 면 |
| `foreground` | 제목·본문 |
| `muted` | 보조 글자. 제목마다 붙이지 않는다 |
| `accent` | 주 행동·현재 선택·진행 정도 세 역할에만 |
| `accent-dark` | 강조색 글자, 선택 윤곽선, 채워진 상태 |
| `accent-weak` | tinted 버튼, 사이드바 선택 줄, 고른 칩 |
| `on-accent` | 강조색 면 위 글자 |
| `fill` | gray 버튼, 입력칸·칩·세그먼트 바탕 |
| `line` | 1px 구분선, 입력칸 테두리 |
| `danger` / `danger-weak` | 오류 문구, 지우기(되돌릴 수 없는 일) |
| `star` | 사용자 리뷰 별점에만. 잇플 매출 순위에는 쓰지 않는다 |
| `map-empty` / `map-partial` / `map-full` / `map-line` | 영토 지도: 안 칠함 / 일부 / 다 칠함 / 경계선. 선택 윤곽은 accent-dark |
| 모서리 `radius-input` 10, `radius-button` 12, `radius-card` 14, `radius-sheet` 20, `full` | 층이 올라갈수록 커진다. 칩·스위치·토스트는 full |
| 그림자 `shadow-card`, `shadow-float` | float는 시트·토스트처럼 실제로 떠 있는 층에만 |

- `light-dark()`는 색만 받는다. 그림자는 길이를 밖에, 색만 안에 둔다.
- 대비 높이기(`prefers-contrast: more`)에서 line·muted·fill이 진해지고, 투명도 줄이기·backdrop-filter 미지원이면 유리는 불투명 surface가 된다.
- **강조색 세 역할**: 주 행동 하나(화면당), 현재 선택(탭·선택된 지역), 진행 정도(채운 칸). 장식에 쓰지 않는다(목록 점 등).
- **유리(재질)**: HIG Materials에 따라 탐색·조작 층에만 쓴다. 상단·하단 바 `glass-bar`, 사이드바 `material-sidebar`, 시트·토스트 `material-thick`, 그림 위 캡션 `glass-bar`. 내용 층(예시 면, 목록 묶음)은 불투명에 가까운 `surface`. 재질은 층마다 하나, 유리 위에 유리를 겹치지 않는다. 마이페이지의 구역 패널(`GlassCard`, `.my-page .glass`)은 기존 사용자 지시로 유지하되 새 화면은 위 원칙을 따른다.
- `SectionTitle`(녹색 꺾쇠 장식)은 팀의 마케팅성 섹션 제목이다. 도구 화면에 쓰지 않거나 페이지당 한 번만.

## 3. 글자

- Pretendard Variable(기본). `word-break: keep-all`, 숫자는 `tabular-nums`. 한글 최소 12px, 대문자·자간 라벨 스타일에 한글 금지.
- 크기는 Tailwind 스케일만(`text-sm` 14, `text-base` 16, `text-lg` 18, `text-xl` 20, `text-2xl` 24). 1px 단위 임의 크기 금지.
- 글자 단계는 `styles/components.css` 유틸리티로만 쓴다(2026-11-24 사용자 지시: Pretendard 굵기를 토스 규칙으로).

| 유틸리티 | 크기/행간 | 굵기·자간 | 쓰임 |
|---|---|---|---|
| `type-title` | 24/32 | 700, -0.02em | 화면 제목 |
| `type-section` | 20/28 | 600, -0.01em | 구역 제목 |
| `type-row` (`list-row` 포함) | 18/26 | 500, -0.01em | 목록 줄 이름, 식당 이름 |
| `type-body` | 16/24 | 400 | 본문, 개수 |
| `type-caption` | 14/20 | 500(설명은 400) | 날짜, 상태, 도움말 |

  근거: skku-notice-platform DESIGN(제목 700~800, 목록 600, 메타 500, 100~300 금지, 자간 -0.01em), 토스 위계 원칙(제목·설명·결과 구분). TDS 정확한 수치는 공개 문서 미확인.
- 굵게는 화면 제목, 핵심 수치, 선택 상태에만.

## 4. 조작과 상태

- 흐름과 구조는 `toss-ux-design` 스킬: 클릭 수를 먼저 세고, 화면 제목 아래 부제 없음, 설명은 구역 제목 아래 한 줄, 주 행동 하나.
- 눌리는 요소는 모두 같은 반응(hover `bg-foreground/5`, active `bg-foreground/10`, focus-visible 강조색 윤곽선). 행마다 경계가 보인다.
- 이동하는 줄(꺾쇠)과 고르는 줄(스위치)을 한 묶음에 섞지 않는다.

- 조작 영역 44px 이상(`Button` h-11). 포커스는 `focus-visible` 윤곽선(팀 Button 규칙 따름). 핀치 줌 막지 않음.
- 선택 상태는 색만으로 구분하지 않는다: 채움 + 글자/체크 + `aria-pressed`/`aria-checked`.
- 설정은 즉시 반영. 저장 버튼·확인 대화상자·토스트 없이 바뀐 화면이 피드백. 보이지 않는 설정만 "저장했어요" 한 줄.
- 되돌리기 어려운 동작(기록 삭제)만 화면 안에서 한 번 더 묻는다. `window.confirm` 대신 인라인 확인.
- 비어 있는 상태는 무엇이 생기고 어떻게 시작하는지 한 문장 + 행동 하나.
- 움직임은 기본 없음. 상태 변화를 설명할 때만 150~200ms, `prefers-reduced-motion`에서 끔.

## 5. 배치

- 모바일 먼저(390px). 1440px에서는 가운데 정렬 기둥(`max-w-3xl` 안팎)으로, 넓다고 칸을 억지로 늘리지 않는다.
- 페이지의 중심은 하나. 마이페이지는 "내 영토 지도"가 중심이고, 나머지는 그 아래 목록.
- 왼쪽 시작선을 하나로 맞춘다. 가운데 정렬 히어로 금지.

## 6. 데이터 정직성

- 예시 데이터는 예시라고 화면에 밝힌다(비회원·백엔드 연결 전). 사용자 실제 기록처럼 보이게 하지 않는다.
- 방문 기록은 사용자가 직접 남긴 것이다. 결제·방문 인증처럼 표현하지 않는다(기획서 P1-03).
- 공개 범위 기본값은 모두 "나만 보기"(기획서 §8).

## 7. 공용 부품 (한 번 정의하고 재사용)

토스 TDS·당근 SEED처럼 모양은 한 곳에서만 정의한다(2026-11-24 사용자 지시: "컴포넌트들 css로 구현해서 재활용"). 전체 예시와 조작은 `/styleguide`.

| 층 | 위치 | 들어 있는 것 |
|---|---|---|
| 토큰 | `apps/web/src/styles/tokens.css` (팀 기본은 `globals.css @theme`, 팀원 소유) | 색, 모서리, 그림자, em-theme·team-theme |
| CSS 유틸리티 | `apps/web/src/styles/components.css` | `pressable`, `list-group`, `list-divided`, `list-row`, `type-*`, `glass-bar`, `material-sidebar`, `material-thick`, `field`(입력칸·오류·포커스), `focus-ring`, `dialog.em-dialog`(시트 배경·등장) |
| 앱 화면 부품 | `apps/web/src/components/em` (`@/components/em`) | ActionButton·actionButtonClass(fill·tinted·gray·glass·plain·danger / sm 40(누름 44)·md 44·lg 56), IconButton, TextField, SearchField, Switch·SwitchTrack, Checkbox, SegmentedControl, FilterChip, ProgressBar, useToast·ToastRegion, BottomSheet, Skeleton·SkeletonRow, EmptyState, FoodTile, AchievementBadge, SeasonBanner, MapMarker, TerritoryMap |
| 목록 부품 | `apps/web/src/components/list/List.tsx` | ListSection, ListGroup, ListLinkRow, ListSwitchRow(SwitchTrack 공유) |
| 팀 공통 UI | `apps/web/src/components/ui` (팀원 소유) | Button, GlassCard, Input, ItemCard, ReviewCard, SectionTitle, StarRating — 팀 소개·마케팅 화면용. 앱 화면(지도·도감·마이)은 em 부품을 쓴다 |
| 인증 부품 | `apps/web/src/components/auth` | GoogleSignInButton(Google 브랜드 규정 색) |
| 아이콘 | `apps/web/scripts/icons/*.svg` → `node apps/web/scripts/build-icons.mjs` → `public/icons/sprite.svg`, `components/icon/names.ts`(`iconNames`) | 24 격자·선 1.75 한 세트(34개). 다른 세트를 섞지 않는다 |
| 그림 자산 | `apps/web/public/images/{maps,markers,badges,foods,illustrations,seasons}` | EatsMine SVG 키트(2026-11-24). 음식 목록 `foods/manifest.json`(계절은 예시 분류), 카탈로그 `src/lib/assets/catalog.ts` |
| 지도 경계 | `public/images/maps`(단순화 미리보기), 정식 재생성 `apps/web/scripts/maps/rebuild_maps.py`, 카카오 Polygon `src/lib/map/kakao-territory.ts` | 미리보기 경계는 위치 판정·영토 획득에 쓰지 않는다. 출처 SGIS(2026-10-01)·krmap·admdongkor(CC BY 4.0) 표기 유지 |

- 새 화면은 위 부품을 먼저 쓴다. 같은 클래스 묶음을 화면 파일에 두 번 쓰게 되면 유틸리티나 부품으로 올린다.
- 새 유틸리티·부품은 여기 표, `eatsmine-ui-design` 스킬, `/styleguide`에 같이 적는다.
- 팀원 소유 층(`globals.css`, `components/ui`)을 바꿔야 하면 사용자에게 먼저 알린다. 부품은 데이터를 props로만 받는다(백엔드 방식 미정, 2026-11-24).
- Claude Design System 아티팩트: https://claude.ai/artifact/CfahhRk5J9p868swYuryLN (코드와 같은 토큰을 유지).

## 8. 내비게이션 (2026-11-24 사용자 지시: "모바일에서 햄버거 별로, 아래 조작", 성대공지 플랫폼과 같은 구조)

- 1024px 이상: 왼쪽 고정 반투명 사이드바(macOS). 묶음 → 항목 두 단계, 현재 항목은 `accent-weak` 줄 + `aria-current`. 마우스 전용(`pointer: fine`) 줄만 36px, 그 밖은 44px.
- 1024px 미만: 햄버거·서랍 없음. 아래 유리 탭 바(1차 이동, 묶음 3~5개, 아이콘 + 짧은 라벨, 현재 탭은 활성 표시 + `aria-current="page"`, 안전 영역 여백) + 상단 바 아래 가로 칩 줄(2차 이동).
- 탭 바에는 이동만. 밝기 전환 같은 동작은 상단 바에 둔다. 토스트·하단 고정 버튼은 탭 바 위(`--em-bottom-bar`).
- 이동 뒤 포커스는 목적지 제목(`tabIndex=-1`)으로 옮긴다. 상단 바 높이만큼 `scroll-margin-top`.

## 9. 근거 규칙 (2026-11-24 확인)

**Apple HIG** (iOS·macOS)
- 재질: 유리는 탐색·조작 층에만, 내용 층에 쓰지 않는다. 과하게 쓰지 않는다. 투명도 줄이기·대비 높이기에서 확인한다. — https://developer.apple.com/design/human-interface-guidelines/materials.md , https://developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass.md
- 버튼: 누르는 영역 44×44pt 이상. 강조 버튼은 화면에 1~2개, 우선순위는 크기가 아니라 스타일로. 파괴적 동작을 주 버튼 역할로 두지 않는다. — https://developer.apple.com/design/human-interface-guidelines/buttons.md
- 사이드바: 두 단계까지, 기본으로 숨기지 않는다, 중요한 정보·동작을 맨 아래 두지 않는다. — https://developer.apple.com/design/human-interface-guidelines/sidebars.md
- 시트: 한 번에 하나. Cancel·Done·Back을 함께 두지 않는다. — https://developer.apple.com/design/human-interface-guidelines/sheets.md
- 탭 바: 이동에만 쓰고 동작에 쓰지 않는다. 탭 수는 최소로, 모든 탭은 항상 활성. — https://developer.apple.com/design/human-interface-guidelines/tab-bars.md
- 목록: 이동 목록은 선택한 줄을 계속 강조, 선택 목록은 체크로. 글자는 짧게. — https://developer.apple.com/design/human-interface-guidelines/lists-and-tables.md
- 미확인: 탭 최대 5개는 Apple 공식 수치로 확인하지 못함(서드파티 자료만).

**Android Material 3**
- 내비게이션 바: 같은 단계 목적지 3~5개, 아이콘 + 짧은 라벨(줄바꿈·말줄임 피함), 현재 목적지는 활성 표시와 채운 아이콘. 5개 초과면 레일. — https://developer.android.com/design/ui/mobile/guides/layout-and-content/layout-and-nav-patterns
- 미확인: m3.material.io 원문과 M3 Expressive의 바 높이·표시 수치는 직접 확인하지 못함.

**당근 SEED** — https://seed-design.io/llms/components/*.txt
- Action Button: 브랜드 Solid는 화면에 하나, 세 개 이상 나란히 두지 않는다, 라벨은 사용자 행동("다음" 같은 모호한 말 금지), Critical은 삭제·초기화처럼 되돌릴 수 없는 일. (action-button.txt)
- Chip: 고르거나 입력한 값·필터용. 여러 개가 선택되므로 선택 상태도 낮은 주목도. (chip.txt)
- Tabs·Segmented Control: 탭은 이동, 세그먼트는 조작. 세그먼트는 2~4개, 화면에 하나. 1차는 Line 탭, 2차는 Chip 탭. (tabs.txt, segmented-control.txt)
- Switch는 즉시 반영, 나중에 저장하는 선택은 Checkbox. Disabled면 라벨도 흐리게. (switch.txt, checkbox.txt)
- List Item: 한 줄에 상호작용 4개 이상 두지 않는다. 체크·스위치 마크가 있으면 줄 전체가 클릭 영역. 안쪽 모서리 = 바깥 모서리 - 여백(동심원). (list.txt)
- Bottom Sheet: 최대 폭 480px, 높이 90%. 파괴적·여러 단계 작업은 위에 닫기 버튼. (bottom-sheet.txt)
- Snackbar: 기본 4초, 한 번에 하나, 보조 행동은 최대 1개. (snackbar.txt)
- 접근성: 색만으로 정보를 전하지 않는다, 터치 44×44px 이상이 이상적, 2초 넘는 애니메이션 지양·동작 줄이기 대응. — https://seed-design.io/llms/foundations/inclusive-design.txt

## 10. 그림 자산 추가 절차

- 필요한 SVG·이미지는 Codex(`gpt-6.1-sol`, `task --write`)에 기존 키트 파일을 화풍 기준으로 읽혀 만든다: 64 격자, 루트 stroke `#354333` 2.4·둥근 끝, 키트 팔레트 안의 채움, 글자·그라데이션·외부 참조·스크립트 금지.
- sharp로 기존 그림과 나란히 렌더해 선 굵기·팔레트·여백을 비교하고 맞을 때만 쓴다. 출처·제작 방식을 `/styleguide` 출처 구역에 적는다.
- 사례(2026-11-24): `illustrations/empty-search.svg`, `empty-reviews.svg`, `load-error.svg`.
