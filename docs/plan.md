# EatsMine 기획서 v2.0

> BC카드 eat.pl(잇플) 유입형 AI 미식 탐험 웹서비스  
> 기준일: 2026-11-23 | 프로젝트: https://github.com/Suuuuug/EatsMine  
> 기존 ‘Eatpl 기획서’ 탭은 보존하고 본 문서는 실행·구현용 상세 기획서로 사용한다.  
> 원본: Google 문서 `EatsMine 기획서 v2.0` 탭을 2026-11-23에 옮김. 원본이 바뀌면 이 파일도 갱신한다.


## 0. 결론 — 무엇을 만들고 왜 만드는가

- 서비스 한 줄: “오늘 뭐 먹지?”에서 시작해 지역·제철음식·게임형 도감을 탐험하고, 실제 식당 상세 정보는 BC카드 잇플에서 확인하는 웹서비스.
- 최우선 목표: EatsMine 트래픽 그 자체가 아니라, 공모전에서 인정하는 eat.pl 유입 활성 사용자 수를 늘리는 것.
- 주요 가치: 음식→지역→맛집으로 연결하는 발견 경험, BC카드 결제 데이터 기반 매출 인기 정보, 방문한 지역을 색칠하는 수집 재미.
- 핵심 전환: 지역/음식 선택 → 실제 잇플 API 결과 → 식당 카드의 ‘잇플에서 상세 보기’ → API 원본 상세 링크.
- 설계 원칙: 첫 방문자는 로그인 없이 검색·탐색·잇플 이동 가능. 회원가입·리뷰·도감 기록을 전환 장벽으로 만들지 않는다.
- 경쟁 서비스 구분: 네이버지도/카카오맵의 범용 리뷰·지도 복제가 아니라 ‘테마로 맛집 발견 → 잇플 이동 → 탐험 기록’에 집중한다.
- 명칭: 대외 서비스명 EatsMine(팀 최종 확정 필요), 공식 BC카드/잇플 서비스로 오인되지 않도록 별도 브랜드·출처를 표기한다.

## 1. 성공 지표와 공모전 대응

- North Star KPI: 주최 측에서 인정한 잇플 유입 활성 순사용자 수. 내부 클릭 수는 집계 조건을 보장하지 않으므로 별도 보조 지표로 취급한다.
- 보조 KPI: 유입 UV, 검색 시작/완료율, 결과 노출률, 잇플 상세 링크 클릭률(outbound CTR), 채널별 순사용자·전환, 공유 재유입, 오류율, 모바일 이탈률.
- 이벤트 흐름: landing_viewed → search_submitted → results_viewed → restaurant_opened → eatpl_outbound_clicked. 탐험 공유 시 share_created / share_opened 기록.
- 초기 실험 목표(가설): 신규 사용자가 첫 방문 30초 이내 식당 카드를 보고 모바일 3회 안팎의 조작으로 잇플에 이동. 데이터 확보 뒤 목표 수정.
- 공모전 공개 안내 기준 등록 관련 마감은 2026-12-03로 파악되었고 12월 중 성과가 집계되는 행사이므로, 제출 전 공식 페이지의 마감·집계 기간·등록 도메인·URL 추적 요건·참여 제한을 다시 확인한다. 문서의 날짜가 최종 약관을 대체하지는 않는다.
- 오인 방지: 잇플 API의 매출 랭킹은 사용자 별점·리뷰 점수가 아니다. 공모전 집계 수치와 자체 클릭 로그를 합산하거나 동일하게 표시하지 않는다.

## 2. 핵심 페르소나와 유저 플로우

- 사용자 A(지역 출발): “수원에서 뭐 먹지?” → 홈 검색 → 지도 이동 → 식당 카드 → 잇플 상세 → 필요시 방문 기록.
- 사용자 B(음식 출발): 제철음식 도감 → 음식 선택 → 음식과 연관된 지역 추천 → 검색 필터 적용 → 잇플 상세.
- 사용자 C(가벼운 게임): 친구의 ‘내가 먹어본 지역 지도’ 공유 링크 유입 → 지역/음식 카드 → 잇플 맛집 확인 → 내 탐험 시작.
- 사용자 D(AI 사용): “주말에 부산에서 가족과 해산물” → AI가 지역·업종·테마를 구조화 → 잇플 API 조회 → 근거가 있는 매장만 노출.
- 공통 비즈니스 흐름: 발견(흥미) → 탐색(선택) → 잇플 방문(전환) → 기록(재방문) → 공유(신규 유입).
- 필수 규칙: 비회원도 핵심 흐름 완결. 외부 이동 직전에 회원가입 팝업, 강제 설문, 광고를 띄우지 않는다.

## 3. 화면 구성 및 라우팅

- / : 홈/지역 탐험. 상단 Header, Hero ‘오늘 어디를 먹어볼까?’, 음식·지역 선택, 기본 추천 지역, 왼쪽 목록+오른쪽 지도, 잇플 CTA. 검색·선택값은 URL query에 반영.
- /dictionary : 제철음식 도감. 음식명 검색, 계절 탭, 흑백/컬러 카드, 음식 상세, ‘이 음식 먹으러 가기’ CTA. 클릭 시 /?food=...&region=... 이동.
- /my : 개인 지역 지도/도감 완성도. 비회원은 예시 지도 또는 로컬 임시 기록, 회원은 사용자 데이터 로드. 기록 추가/삭제/공개범위 관리.
- /share/[shareId] : 공개 가능한 지도·음식 테마 공유 카드. 불특정 다수에게 정확한 방문시간/민감한 위치/닉네임을 기본 노출하지 않음.
- /about : 서비스의 목적, 데이터 출처, ‘매출 인기’ 의미, 잇플 외부 이동·개인 기록의 차이, 문의/정책.
- 모바일에서는 지도+바텀시트(목록), 데스크톱에서는 결과 리스트 35~40% + 지도 60~65%를 기본 후보로 사용. 실제 비율은 Figma 복제본 확인 후 조정.
- 공통 상태: 기본/검색중/결과없음/서버오류/선택/키보드 포커스/모바일/미로그인.

## 4. P0 MVP 요구사항과 완료 기준

- P0-01 지역 검색: 시/도·시/군/구 검색 및 선택, 기본 인기 지역, 자동완성, query state 복원. 완료: 검색 후 결과와 지도가 일치.
- P0-02 BC 잇플 데이터: 승인된 eat.pl API/공식 연계 경로로 매장 검색; 실제 name, address, genre, rank percentile, merUrl만 화면에 사용. 완료: 정상/빈값/401·403·502·503 에러 표시.
- P0-03 결과 지도: 식당 카드 ↔ 지도 마커 선택 상태 동기화. API 응답에 좌표가 없으면 정식 지도 API 지오코딩으로 보완. 동일 이름만으로 다른 가게를 잘못 연결하지 않음.
- P0-04 잇플 CTA: 모든 유효한 결과 카드에 ‘잇플에서 상세 보기’를 눈에 띄게 배치. 원본 merUrl로 직접 이동. URL 임의 조작/단축/중간 리다이렉트 금지. 클릭 이력 기록이 실패해도 이동은 정상 작동.
- P0-05 AI 의도 분류: 자연어를 지역·음식·업종·방문 형태로 변환해 검색. 결과는 검증된 API 정보만 사용하고, 모델 실패 시 수동 검색·추천 필터로 fallback.
- P0-06 유입 측정: 유입 채널, 탐색, 식당 카드, 잇플 이동 이벤트. 우리 서비스의 클릭과 주최 측의 인정 실적은 별도 대시보드로 관리.
- P0-07 반응형·배포: 모바일 검색→잇플 이동 E2E, 이미지 로드·성능·보안 확인, 배포 도메인으로 등록 및 확인.
- 완료 정의: 비회원 1명이 링크 유입 후 지역/음식 선택→실제 결과→원본 잇플 상세 페이지까지 끊김 없이 도달.

## 5. P1/P2 차별화 기능

- P1-01 제철음식 도감: 음식·추천 계절·대표 지역·출처가 있는 설명, 수집 전 회색/수집 후 컬러, 음식→지역→잇플 검색 연동.
- P1-02 지역 영토 칠하기: 전국 행정구역 코드를 이용해 시군구 단위로 방문 기록, 광역시도 구 단위. 완료한 지역만 색상 변경. 유저별 영역이며 리뷰/기록 중복은 지역 1회로 계산.
- P1-03 방문기록/후기: 별점 1~5, 방문일, 짧은 후기, 본인 기록 여부 표시, 비공개 기본. 실제 방문 인증이나 BC 결제 인증이 있는 것처럼 표현하지 않음.
- P1-04 친구에게 공유: 나의 지역 도감/이번 달 제철음식 테마 이미지+딥링크, Web Share API/링크 복사. 공유 후 유입자는 곧바로 해당 지역 탐험 가능.
- P1-05 테마별 랜딩 페이지: ‘11월 제철음식’, ‘대전 미식 여행’, ‘광안리 뭐 먹지?’ 같은 원본 콘텐츠. 모든 페이지에 관련 잇플 CTA.
- P2: 지역 간 랭킹·영토 대결, 랜덤 탐험, 추가 다국어, 추천 코스·지도 경로, 계절 알림. P0 전환 경험을 해치거나 유입을 강제로 유도하는 기능은 제외.

## 6. 실제 잇플 API·데이터 연동 기준

- 참고: https://github.com/NomaDamas/k-skill/blob/main/docs/features/bccard-eatpl-search.md
- 해당 공개 가이드에서는 location/address, merTpbuzNm/genre, merNm/merchant_name을 입력으로 사용하며 최대 100개 매출 상위 업소를 조회할 수 있다고 설명한다. 구체적인 운영 권한·호출량은 승인 범위에 따름.
- 중요한 필드: merUrl(잇플 상세 링크), allSaleRnk(전국 매출 상위 백분위), ccgSaleRnk(지역 매출 상위 백분위), srtTime/endTime(예상 영업시간). 순위 백분위는 작을수록 상위이며 매출액 금액이 아니다. 예: 0.04는 상위 0.04%로 표기.
- 표시 문구: ‘eat.pl 잇플 · BC카드 결제 데이터 기반’ (공식 제휴·사용 지침 확인). 타 사이트의 별점 등 추가 데이터는 출처를 구분하고, 없을 때 추정하지 않음.
- 보안: 기관코드·API 키·중계 토큰은 Next.js 서버 환경변수에서만 사용. 퍼블릭 프록시의 소유/안정성/약관을 확인하고, 실제 서비스를 위한 허가된 API 접근을 우선.
- 오류 정책: upstream 장애·권한 없음·데이터 없음·위치 매칭 실패를 구분. API 결과 없는 매장을 잇플 결과로 가장해 보여주지 않음.
- 링크 정책: API가 제공한 merUrl을 수정하지 않고 직접 href로 사용. 사용자 측 실제 이동·Referrer Policy·공모전 인정 기준을 브라우저별 테스트. 브라우저와 정책에 따라 리퍼러가 달라질 수 있으므로 운영진 요건을 검증해야 함.

## 7. AI 추천 설계(환각 방지 포함)

- AI 범위: 자연어 사용자 의도를 구조화해 식당 API 검색 조건으로 바꾸는 역할. AI 자체가 레스토랑·영업시간·평점·매출순위를 생성하지 않음.
- 예시 입력: “대전에서 친구랑 빵 말고 매운 음식 먹고 싶어.”
- 정규화 예: { region: "대전", excludes: ["빵"], foodTags: ["매운 음식"], company: "친구", intent: "맛집 탐색" }.
- 파이프라인: 질의→Zod JSON 검증→지역/업종 매핑→잇플 API 검색→중복/품질 정리→결과 카드→원본 잇플 상세.
- 실제 사용 가능한 데이터만으로 결과를 설명하고, 추천 근거는 ‘지역 일치/음식 유형 일치/매출 인기도’로 분리.
- LLM 선택: 서버 측 Gemini 등의 모델(무료 티어는 속도·쿼터 확인). 요청 타임아웃·캐시·rate limit·기본 프롬프트 인젝션 대응·규칙 기반 fallback 제공.
- 실패 시 UI: “AI 추천이 잠시 어려워요. 지역을 선택해서 계속 탐색할 수 있어요.”

## 8. Figma 디자인 적용 및 UI/UX 규칙

- 레퍼런스: https://www.figma.com/design/BAfcONMwqT3Xo8Sc4RvxKp/Interactive-Website--Figma-UI-Design-Tutorial-for-Beginners-%7C-Step-by-Step-Guide--Community-?node-id=3-2&m=dev
- 현황: 원본 Figma 파일에 MCP 접근 시 편집권한 부족 오류가 발생했으므로 정확한 Frame·색상·간격·폰트·이미지는 아직 검증되지 않음. 반드시 팀 소유 Drafts/프로젝트로 복제 후 프레임 상세를 확인할 것.
- 디자인 해석: 레퍼런스의 비주얼 분위기/레이아웃/타이포그래피를 시작점으로 사용. 실제 홈은 사진/검색/지도/식당 CTA가 중심인 EatsMine UX에 맞게 변형. 원본 디자인을 스크린샷 1장으로 통째로 붙이지 말 것.
- 홈 데스크톱: 공통 Header → Hero/테마 추천 → 필터/AI 한 줄 검색 → 좌측 결과 카드 패널 + 우측 지도 → 간단한 사용법/공유 소개.
- 홈 모바일: 검색→필터 칩→지도 전폭 + 드래그 가능한 결과 바텀시트(또는 목록/지도 토글). 식당 카드에 원본 잇플 CTA가 스크롤 없이 발견 가능해야 함.
- 도감: 계절 탭, 음식 카드 사진, 흑백/컬러 상태, ‘이 음식 먹으러 가기’→ 검색.
- 마이: 방문 수/지도 색칠/도감 완성률/공유 버튼. 개인정보 공개 기본 OFF.
- 공통 컴포넌트: Header, HeroSearch, RegionPicker, FoodCard, FilterChips, MapView, RestaurantCard, EatplLinkButton, LoadingSkeleton, ErrorState, TerritoryMap, ShareCard, AuthDialog.
- 디자인 시스템: CSS 변수/ Tailwind theme에 color.brand, color.bg, color.surface, color.text, spacing, radius, typography, shadow 정의. 피그마 토큰을 추출한 뒤 최종 값 확정.
- 접근성: 가독성 대비 4.5:1 이상, 키보드 탐색·focus-visible, 의미 있는 alt, 반응형과 터치 타깃 44px 수준, 움직임 감소 옵션. 지도와 동일 정보의 텍스트 목록 동시 제공.
- 검수 해상도: 390px 모바일, 768px 태블릿, 1440px 데스크톱. 실제 Figma 화면과 브라우저 스크린샷 비교.

## 9. 시스템 아키텍처(초기 권장안)

- 권장 스택: Next.js(App Router) + TypeScript + Tailwind CSS + Supabase(PostgreSQL/Auth) + Vercel + 승인된 잇플 API + 지도 제공자 공식 SDK/API.
- NestJS는 첫 출시에는 미사용 권장: Next.js Route Handlers로 BFF/API를 통합해 개발·배포 비용을 절감. 이후 트래픽·복잡도가 증가하면 NestJS로 비즈니스 계층 분리 가능. 기존 v1.0의 기술 선택은 후보로 보존.
```text
[브라우저: Next.js React UI]
   ├─ GET /api/restaurants?region=&food=&category= → [Next.js 서버/BFF] → [허가된 eat.pl API/프록시] → [정규화된 식당 정보와 merUrl]
   ├─ POST /api/recommend → [LLM 의도 분류] → [eat.pl API] → [매장 결과]
   ├─ [지도 UI] → [공식 지도 SDK/지오코딩] (BC 검색과 별도, 좌표 매칭)
   ├─ [Supabase Auth] → [RLS 적용 PostgreSQL: 사용자·방문·도감·리뷰·공유]
   └─ [analytics endpoint] → [비식별 클릭/유입 이벤트]
   └─ [잇플 이동] → 브라우저에서 API가 제공한 merUrl 직접 열기(내부 분석 실패해도 이동 가능)
```
- 백엔드 역할: 입력 검증/캐싱/API 응답 변환/공개 가능 필드 필터/Rate-limit/LLM 호출/서비스 오류 처리.
- 프론트 역할: 접근성·검색 UX·URL 상태 관리·지도/카드 동기화·낙관적 선택 UX·최소 재렌더.
- 기술 규칙: 코어 검색은 서버 사이드에서 수행, 잇플/LLM 키를 클라이언트 번들에 넣지 않음, 외부 API DTO와 앱 내부 도메인 타입 분리.

## 10. 대략적 ERD 및 테이블

- auth.users (Supabase 인증 원본)
- profiles(id uuid PK/FK→auth.users.id, nickname, avatar_url NULL, created_at)
- regions(id PK, parent_id FK NULL→regions.id, admin_code UNIQUE, name, level, geometry_key NULL)
- foods(id PK, name, image_url, description, source_url)
- food_seasons(id PK, food_id FK, month, region_id FK NULL, source_url) — season 범위 1~12
- food_regions(food_id FK, region_id FK, reason, PRIMARY KEY(food_id,region_id))
- restaurants(id PK, source, external_merchant_id NULL, name, address, region_id FK NULL, lat NULL, lng NULL, mer_url, fetched_at) — API 결과의 선택적 단기 캐시. 가맹점 고유 식별자가 없으면 안정적 매칭 전략 정의.
- reviews(id PK, user_id FK→profiles, restaurant_id FK→restaurants, rating, content, visited_at, visibility, created_at)
- user_region_visits(user_id FK, region_id FK, first_visited_at, source_review_id FK NULL, UNIQUE(user_id,region_id))
- user_food_collection(user_id FK, food_id FK, collected_at, source_review_id FK NULL, UNIQUE(user_id,food_id))
- share_links(id PK, user_id FK NULL, share_type, payload_json, expires_at NULL, created_at)
- outbound_events(id PK, anonymous_session_key, restaurant_id FK NULL, source_channel, placement, occurred_at) — 개인정보 최소 수집, 보존기간 정의.
- 관계: profiles 1:N reviews / reviews N:1 restaurants / profiles M:N regions·foods (방문/수집 중간 테이블) / foods M:N regions / regions 1:N restaurants.
- 설계 고려: RLS로 본인 리뷰/수집/방문 데이터 읽기·수정 제한, 공개 공유 화면만 별도 권한. 외부 merUrl은 원문 불변, 이벤트 삭제 정책, 이용자 탈퇴 시 연쇄 삭제. regions geometry는 별도 GeoJSON 정적 자산 저장 가능.
- 주요 인덱스: regions(admin_code), restaurants(region_id), reviews(user_id,created_at), outbound_events(occurred_at,source_channel). 외부 API 응답의 캐시 무효화 및 저장 허용기간 검토.

## 11. API 계약 및 이벤트 명세(초안)

- GET /api/regions?q= — 지역 자동완성, 표준 regionId/code/name 반환.
- GET /api/foods?month=&q= — 제철음식 도감 데이터.
- GET /api/restaurants?regionId=&foodId=&category= — 정상 200 {items:[{id,name,address,category,rankPercentile,merUrl,lat,lng}],source,updatedAt}, 미결과 200 빈 배열, 오류 시 구조화 에러 코드.
- POST /api/recommend {prompt,regionHint?} — 지역/업종/foodTags 정규화 후 검색된 식당. LLM 실패 시 폴백.
- GET /api/me/territories, POST /api/me/visits — 로그인 사용자 지역 기록.
- GET/POST /api/me/collection — 사용자 수집 음식 조회/추가(중복 방지).
- POST /api/reviews — 별점 1..5, 후기 길이 제한, rate-limit, 소유권 검증.
- POST /api/events/outbound — {restaurantId,sourceChannel,placement,sessionKey}; 네트워크 실패해도 잇플 이동 유지.
- 공통 반환: API 결과 속성 nullable 명시, 400 입력 오류/401 인증/403 권한/429 제한/502 외부 데이터 오류. 로그에 API 키·원문 사용자 위치 기록 금지.
- 이벤트명: landing_viewed, search_submitted, results_viewed, restaurant_card_opened, eatpl_outbound_clicked, food_selected, share_created, share_opened.

## 12. 저장소 구조와 개발 규칙

```text
EatsMine/
  app/(public)/page.tsx, app/dictionary/page.tsx, app/my/page.tsx, app/share/[id]/page.tsx
  app/api/restaurants/route.ts, app/api/recommend/route.ts, app/api/events/outbound/route.ts
  components/layout/, components/search/, components/map/, components/restaurant/, components/dictionary/, components/territory/, components/ui/
  lib/eatpl/client.ts, lib/eatpl/normalize.ts, lib/ai/, lib/geo/, lib/supabase/, lib/analytics/
  types/, styles/tokens.css, public/images/, public/maps/
  docs/architecture.md, docs/erd.md, docs/design.md, docs/api.md, docs/plan.md, docs/rules.md
```
- 팀 코드 규칙: TypeScript strict, ESLint+Prettier, 명확한 타입, 검증된 서버 입력, 매직 넘버·하드코딩 링크 금지, UI와 비즈니스 로직 분리, 재사용 가능한 컴포넌트, 실제 기능 연결 없는 버튼 금지.
- GitHub 브랜치 예시: feat/explore-map, feat/eatpl-api, feat/dictionary, feat/analytics. 기능별 PR, 리뷰 최소 1인, main 직접 push 최소화, 환경변수 .env.example만 커밋.
- AI 개발 규칙: Claude Code/Codex 작업 전 docs 및 기존 컴포넌트 확인, PR 단위 작은 변경, 테스트 및 빌드 성공, 스크린샷 대조. Figma 제공 코드는 참고 자료이며 프로젝트 구조에 맞춰 구현한다.

## 14. 배포, 테스트, 보안, 운영

- 배포: GitHub → Vercel(Next.js 프론트+BFF) / Supabase(Postgres+Auth). 초기엔 NestJS 독립 배포하지 않음. 환경변수는 프로덕션/프리뷰 분리.
- 필수 테스트: 지역 검색 → 결과 리스트 → 원본 잇플 merUrl 동일성 → 모바일·데스크톱 새 탭 이동; 유효하지 않은 링크 CTA 차단; 지도 선택·URL query 동기화; AI JSON 오류·타임아웃/폴백; 무권한 사용자의 개인 정보 접근 차단; 링크 클릭 통계와 공식 실적 차이 확인.
- 보안: 공개/비공개 API 키 분리, 외부 URL allowlist(잇플 도메인 정책 확인), 서버 rate limit, 입력 정규화, Supabase RLS, XSS 대응, CSRF/권한 검증, 사용자 탈퇴/삭제, 최소 로그, 의도치 않은 사용자 위치 저장 금지.
- 성능: 이미지는 최적화, 지도 SDK 지연 로드, 검색 캐시(제휴 데이터 보존기간 허용 범위), 핵심 카드 우선 로드, 장애 시 재시도 안내, Lighthouse 성능·접근성 점검.
- 법무/출처: Figma 커뮤니티 소스 라이선스, 지도 이미지/타일 재배포 권한, 제철 공공데이터 라이선스, BC/eat.pl 상표·제휴 관계 표현, 리뷰 개인정보처리방침·커뮤니티 운영 정책 확인.

## 15. 홍보 및 잇플 유입 실험

- 획득 전략: 에브리타임(홍보 규칙 확인), 인스타그램 스토리/릴스, 친구의 카카오 공유, 지역/제철음식 검색 페이지, 개발기록 SNS.
- 콘텐츠 예시: “내가 먹어본 한국 지도 몇 칸?”, “11월 제철음식 도감”, “수원 먹거리 탐험”, “오늘은 랜덤 미식 여행”. 관심 유발 → 지역/음식 결과 → 잇플 상세 CTA.
- 공유 핵심: 나의 지도 결과 카드 + ‘너도 색칠하기’ 딥링크. 사용자가 공유 후 친구가 검색부터 다시 시작하지 않게 테마/지역 query 복원.
- SEO: 지역별 음식 소개 페이지는 실제 취재/확인한 고유 설명과 데이터 출처, 제목/OG 메타, sitemap/robots. 내용이 빈약한 자동 생성 페이지 양산 금지.
- A/B 테스트: 히어로 CTA ‘지역부터 탐험’ 대 ‘제철음식부터 탐험’; 카드 CTA 문구/위치. 사용자에게 혼동 주는 숨은 리다이렉트·클릭 유도 금지.
- 분석: inbound channel/landing page/검색→결과→outbound CTR·공식 대회 유입 수를 별도로 비교. 채널별 성과 기반 홍보 예산·활동 조정.

## 16. 단계별 일정과 우선순위

- 2026.11.23~11.25: Figma 팀 복제·시안 검증, Next.js 초기화, API/merUrl 검증, 홈 검색·지도·식당 카드 P0 개발.
- 11.26~11.28: AI 간단 추천, 원본 링크/리퍼러 동작, 이벤트 수집, 반응형·에러 처리, Vercel 임시 배포.
- 11.29~12.02: P0 안정화·신청, 제철음식 도감 미니 버전, 공유 메타/카드, 테스트 유입, 공식 조건 확인. 마감일 전에 서비스 등록 완료를 검증.
- 12.03 이후: 공모전 실적 집계 확인, 유입 개선과 콘텐츠 홍보, P1 최소 기능 안정화. 실제 마감·운영 기간은 공식 공지 재확인.
- P0 정의: 비회원 사용자가 ‘검색/테마 선택→실제 BC 결과→잇플 상세 이동’ 가능, 공식 규정에 맞는 URL·도메인으로 배포됨.
- P1 정의: 음식 도감→지역→잇플 연결 및 공유/개인 방문 기록.
- P2 정의: 후기·고도화 영토 경쟁·랭킹·다국어 등.

## 17. 리스크와 대응

- API 권한/기관코드/IP 등록 지연: 승인·사용 조건부터 파악, 카드 mock와 서버 DTO 구현을 분리. 허가 없는 API 우회·스크래핑 금지.
- Figma 원본 접근 오류: 원본 커뮤니티 파일을 팀 프로젝트로 Duplicate한 뒤 MCP에 복제본 연결. 현재 node 3:2는 상세 스펙 확인 불가 → 임의 픽셀값을 원본 값이라고 쓰지 않음.
- 잇플 전환 클릭은 늘었지만 대회 집계 미반영: 직접 링크·리퍼러·등록 도메인·중간 경유 없는지 확인하고 공식 실적 대시보드와 비교.
- 지도/결제 데이터 불일치: 표준 주소·좌표 검증 및 출처·갱신일 표시. 임의 매장 생성 금지.
- 기능 과다: 영토·후기는 시간 소요가 크므로 공모전 1차 목적(P0) 달성 전에는 개발 제한.
- 개인정보/리뷰 어뷰징: 로그인 후 공개 범위 제어, 신고/삭제, 리뷰 검증 문구, 탈퇴/삭제 정책.

## 18. 참고 링크 및 최종 판단 기준

- 원본 기획 문서: https://docs.google.com/document/d/1B3WgInsAMGQc172LDq8xuc2woek3sV4C-ppglgnqIzg
- Figma 디자인 참고: https://www.figma.com/design/BAfcONMwqT3Xo8Sc4RvxKp/Interactive-Website--Figma-UI-Design-Tutorial-for-Beginners-%7C-Step-by-Step-Guide--Community-?node-id=3-2&m=dev
- GitHub: https://github.com/Suuuuug/EatsMine (2026.11.23 확인 시 빈 저장소)
- K-SKILL BC eat.pl 가이드: https://github.com/NomaDamas/k-skill/blob/main/docs/features/bccard-eatpl-search.md
- K-SKILL 프로젝트: https://github.com/NomaDamas/k-skill
- 공모전 안내(상세 규정 최신 확인): https://edu.bccard.ai/contest
- 최종 의사결정 기준: 이 기능이 사용자가 더 쉽게 음식/지역을 발견하고 자연스럽게 잇플 상세 페이지를 방문하도록 돕는가? 그렇지 않다면 MVP에서 미룬다.
