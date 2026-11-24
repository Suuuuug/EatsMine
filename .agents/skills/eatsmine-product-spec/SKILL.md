---
name: eatsmine-product-spec
description: EatsMine 기획서 v2.0(docs/plan.md)을 기준으로 기능·화면·라우트·API·DB 테이블·이벤트를 계획하거나 구현하거나 리뷰할 때 범위와 우선순위를 지키게 하는 가드. 새 기능을 추가하거나, "이거 만들자", "다음 뭐 하지", "P0 끝났나", 화면/컴포넌트/라우트 설계, 회원가입·리뷰·도감·영토·공유·AI 추천 작업, 이벤트 이름이나 테이블 이름을 정할 때, 일정 대비 진행 점검을 할 때 반드시 먼저 사용한다. 기획서를 직접 언급하지 않아도 EatsMine 제품 동작을 바꾸는 작업이면 적용한다.
---

# EatsMine 제품 범위 가드

EatsMine의 성공 기준은 "공모전이 인정하는 잇플 유입 순사용자"이고 마감이 짧다(등록 2026-12-03 예정, 재확인 필요). 그래서 좋은 기능이라도 P0 전환 흐름보다 먼저 만들면 손해다. 이 스킬은 작업을 시작하기 전에 그 작업이 기획서 어디에 해당하는지, 지금 해도 되는지, 무엇이 완료인지를 확인하게 한다.

정본은 `docs/plan.md`다. 이 스킬은 요약이므로 세부는 항상 해당 절을 열어 확인한다. 원본 Google 문서가 바뀌었을 수 있으면 사용자에게 확인한다.

## 작업 시작 전 4가지 질문

1. **어느 항목인가?** P0-01~07, P1-01~05, P2 중 하나에 매핑한다. 어디에도 없으면 새 범위다. 만들기 전에 사용자에게 알린다.
2. **지금 해도 되나?** P0가 끝나지 않았으면 P1/P2는 원칙적으로 미룬다(기획서 §17 "기능 과다"). 사용자가 명시적으로 지시했다면 진행하되 P0 공백을 한 줄로 알린다.
3. **전환을 해치지 않나?** 최종 기준(§18): 사용자가 음식·지역을 더 쉽게 발견하고 자연스럽게 잇플 상세로 가도록 돕는가. 아니면 MVP에서 미룬다.
4. **완료 기준은?** 아래 표의 완료 조건을 테스트·확인 절차로 바꿔 둔다.

## 우선순위 요약 (§4, §5, §16)

| ID | 내용 | 완료 기준 |
|---|---|---|
| P0-01 | 지역 검색·자동완성·기본 인기 지역·query state 복원 | 검색 후 결과와 지도가 일치 |
| P0-02 | 승인된 경로로 잇플 매장 검색 | 정상/빈값/401·403·502·503 각각 표시 |
| P0-03 | 카드 ↔ 지도 마커 선택 동기화, 좌표 없으면 지오코딩 | 이름만으로 다른 가게를 잘못 연결하지 않음 |
| P0-04 | 모든 유효 카드에 '잇플에서 상세 보기' | 원본 merUrl 직접 이동, 기록 실패해도 이동 |
| P0-05 | AI 의도 분류 → 검색 조건 | 실패 시 수동 검색 fallback, 결과는 API 정보만 |
| P0-06 | 유입·탐색·카드·잇플 이동 이벤트 | 자체 클릭과 주최 측 실적을 분리 관리 |
| P0-07 | 반응형·배포·도메인 등록 | 모바일 검색→잇플 E2E, 등록 도메인 확인 |
| P1 | 제철음식 도감, 지역 영토 칠하기, 방문기록/후기, 공유, 테마 랜딩 | P0 이후 |
| P2 | 랭킹·영토 대결, 랜덤 탐험, 다국어, 코스, 알림 | 공모전 1차 목적 이후 |

P0 전체 완료 정의: **비회원 1명이 링크 유입 후 지역/음식 선택 → 실제 결과 → 원본 잇플 상세 페이지까지 끊김 없이 도달.**

## 공모전 전략과의 관계

순 사용자는 **등록 완료일부터** 집계되고, 동작하는 서비스가 있어야 등록된다. 그래서 P0 안에서도 "지역 선택 → 잇플 결과 카드 → 원본 merUrl 이동"이 가장 먼저이고, 지도(P0-03)와 AI(P0-05)는 그 뒤다. `docs/WINNING-STRATEGY.md`는 일정 단축(11-26 전후 등록), 인앱 브라우저 대응의 P0 승격, 지역 랜딩(P1-05·§15 SEO)의 우선 배치를 **제안**한다. 팀이 확정하기 전까지는 기획서 순서를 따르되, 작업을 고를 때 이 제안과 충돌하는지 사용자에게 한 줄로 알린다.

## 깨면 안 되는 제품 원칙

- 비회원이 검색·탐색·잇플 이동을 끝까지 할 수 있어야 한다. 로그인·회원가입·리뷰·도감 기록을 그 앞에 두지 않는다(§0, §2).
- 잇플 이동 직전에 회원가입 팝업, 강제 설문, 광고를 띄우지 않는다(§2).
- 기능 연결 없는 버튼을 만들지 않는다(§12). 준비 안 된 기능은 숨긴다.
- 개인 기록·공유는 비공개 기본, 정확한 방문시간·민감 위치·닉네임을 공유 화면에 기본 노출하지 않는다(§3, §8).
- 실제 방문 인증이나 BC 결제 인증이 있는 것처럼 표현하지 않는다(§5 P1-03).
- 잇플 데이터·링크·문구 규칙은 `eatpl-integration` 스킬을 따른다.

## 이름은 기획서 것을 그대로 쓴다

팀원과 Claude/Codex가 같은 이름을 써야 이벤트 집계와 코드가 맞는다. 새 이름을 만들기 전에 아래와 기획서를 확인하고, 바꿔야 하면 기획서 갱신을 먼저 제안한다.

- **라우트(§3)**: `/`, `/dictionary`, `/my`, `/share/[shareId]`, `/about`. 검색·선택값은 URL query에 둔다(`/?food=...&region=...`).
- **API(§11)**: NestJS(`apps/api`, :4000)가 같은 경로를 제공하는 것으로 본다(`/api` 접두사 여부는 팀 구조 확인). `GET /api/regions?q=`, `GET /api/foods?month=&q=`, `GET /api/restaurants?regionId=&foodId=&category=`, `POST /api/recommend`, `GET /api/me/territories`, `POST /api/me/visits`, `GET|POST /api/me/collection`, `POST /api/reviews`, `POST /api/events/outbound`.
- **이벤트(§11)**: `landing_viewed`, `search_submitted`, `results_viewed`, `restaurant_card_opened`, `eatpl_outbound_clicked`, `food_selected`, `share_created`, `share_opened`. §1의 `restaurant_opened`는 §11의 `restaurant_card_opened`와 같은 것으로 보고 §11 이름을 쓴다.
- **테이블(§10)**: `profiles`, `regions`, `foods`, `food_seasons`, `food_regions`, `restaurants`, `reviews`, `user_region_visits`, `user_food_collection`, `share_links`, `outbound_events`. RLS로 본인 데이터만 읽기·수정.
- **컴포넌트(§8)**: Header, HeroSearch, RegionPicker, FoodCard, FilterChips, MapView, RestaurantCard, EatplLinkButton, LoadingSkeleton, ErrorState, TerritoryMap, ShareCard, AuthDialog.
- **폴더**: 기획서 §12는 단일 Next 앱(`app/`, `components/`, `lib/`)을 가정했지만 팀 저장소는 모노레포다(2026-11-23 main). 웹은 `apps/web/src/{app,components/{layout,search,map,restaurant,dictionary,territory,ui}}/`, 서버 로직(잇플·AI·지오코딩·DB)은 `apps/api/src/`(NestJS 모듈 단위, Drizzle 스키마 `apps/api/src/db/schema.ts`). 공통 UI(`Button`, `GlassCard`, `ItemCard`, `ReviewCard`, `StarRating` 등)는 `apps/web/src/components/ui`에 이미 있으니 먼저 재사용한다. 새 위치를 정하기 전에 팀원이 만든 구조를 확인한다.

## 화면 품질 기준 (§3, §8)

- 상태: 기본/검색중/결과없음/서버오류/선택/키보드 포커스/모바일/미로그인을 모두 다룬다.
- 레이아웃: 모바일은 지도 + 바텀시트 목록(또는 목록/지도 토글), 식당 카드의 잇플 CTA가 스크롤 없이 보인다. 데스크톱은 목록 35~40% + 지도 60~65% 후보.
- 접근성: 대비 4.5:1, focus-visible, 의미 있는 alt, 터치 타깃 약 44px, 움직임 감소 옵션, 지도와 같은 정보의 텍스트 목록.
- 검수 해상도 390 / 768 / 1440px.
- Figma 원본 값(색·간격·폰트)은 팀 복제본으로 확인하기 전까지 검증되지 않았다(§8, §17). 임의 픽셀값을 "Figma 값"이라고 쓰지 않는다.

## 기획서와 충돌하거나 비어 있을 때

기획서에 없는 결정(지도 제공자, LLM 종류, 패키지 매니저 등)은 추측해서 고정하지 않는다. 후보와 트레이드오프를 짧게 제시하고 사용자에게 고르게 한다. 기획서끼리 어긋나면(예: §1과 §11의 이벤트 이름, §10 캐시 테이블과 대회 데이터 보관 조항) 어느 쪽을 따랐는지 기록하고 기획서 수정을 제안한다.

## 작업 후

변경이 어느 P 항목을 얼마나 진척시켰는지 daily-log와 HANDOFF에 남기고, 완료 기준을 실제로 확인했을 때만 GOAL.md를 체크한다.
