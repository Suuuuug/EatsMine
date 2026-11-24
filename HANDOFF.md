# 인수인계

## 2026-11-13 최초 준비
- 별도 프로젝트를 만들고 공식 대회 페이지와 신청 안내, k-skill 문서 및 선행 사례를 조사했다.
- 잠정 후보: 함께 점심을 고르는 ‘같이 한 끼’. 사용자 조사·실제 데이터·공식 API 권한을 확인하기 전이므로 확정 아님.
- 공식 신청 안내는 등록 완료일부터 집계한다고 설명한다. 메인 대시보드의 11/1 누적 설명과 구분한다.
- contest-idea-forge 원본을 .agents/skills/contest-idea-forge에 설치했다. 실행은 Claude 세션 사용 한도(429)로 첫 추출 단계에서 실패했다. 한도 복구 후 재실행하고 결과를 research/idea-forge/에 저장할 것. 그 결과를 확인하기 전 가설을 검증 완료로 취급하지 않는다.
- 다음: docs/CONTEST.md의 확인 항목, research/ideas.md의 반론과 접근 조건을 확인하고 주제를 확정한다. 실제 인원·예산·운영 방식은 미정이다.
- 신청, 실 API 연결, 도메인 등록, 배포 및 유입 검증은 아직 하지 않았다.

## 2026-11-13 팀원 아이디어 검토
- 구글 문서의 숨은 맛집·중간지점과 추가 DOCX의 푸드 파이트를 검토했다. 원본 DOCX는 `research/team-ideas/`에 보관했고, 비교·출처·실험 제안은 `research/team-ideas-review-2026-11-13.md`에 있다.
- 잠정 제안은 같이 한 끼와 푸드 파이트의 메뉴 결정 흐름을 함께 검증하는 것. 주제 확정이나 실험 완료는 아니다. 현재 혼잡·카카오 평점 제공, 대중교통 API 권한, 잇플 운영 권한은 미확인이다.
- 다음: 팀이 타깃·핵심 경험·투표 범위를 논의하고 사용자 관찰 및 데이터 권한 확인을 진행한다. forge는 여전히 429로 미완료다.

## 2026-11-13 포트폴리오 방향과 공고 직접 확인
- 팀의 우선순위는 상금보다 포트폴리오. 자체 AI 구현을 전제하지 않으며 주제는 미확정. 과거 게임 우선 제안은 재검토 대상이다.
- 공고·신청 안내·API 정의서·잇플·k-skill을 브라우저로 열어 캡처하고, 미작성 신청서·약관 PDF 4쪽을 검토했다. `docs/CONTEST.md`와 `research/contest-evidence/` 참조. 등록 도메인 경유 상세 링크·기간 내 중복 제거·참여 요건이 중요하며 클릭마다 1명은 아니다. 4인 이내, 순 사용자만으로 순위 선정, 데이터 보관·제공 제약을 확인했다.
- Google 신청 폼은 로그인 화면까지만 확인했다. 참가 등록·서명·제출은 하지 않았다. API 프록시/제휴 조건 차이와 자체 AI 필수 여부는 미확인이다.
- contest-idea-forge는 `.agents/skills/` 정본과 `.claude/skills/` 심볼릭 링크가 이미 연결돼 있다. Python 의존성 및 CLI 도움말 확인 완료. 이전 `claude -p` 429 이후 전체 파이프라인 성공은 미검증. 실행 결과를 수동 생성물과 혼동하지 않는다.

## 2026-11-13 공고 종합 스킬
- 공고의 참가 신청·잇플 바로가기, 신청 안내의 API·스킬·PDF·폼 링크를 실제 클릭해 경로를 재확인했다. 폼은 로그인 화면까지, 나머지는 기존 화면 캡처와 PDF로 확인했다. `docs/CONTEST-REVIEW-2026-11-13.md`에 출처별 범위와 신청·측정·데이터·권리 조건을 종합했다.
- 프로젝트 전용 `.agents/skills/eatpl-contest-guide/SKILL.md`를 만들고 `.claude/skills/`에서 같은 정본을 참조하도록 연결했다. 실 API·제출·연락·실사용 유입 검증은 하지 않았다.

## 2026-11-13 최근 성장 웹 서비스 기반 아이디어
- 사용자는 오래된 대형 플랫폼보다 최근 등장·급성장 서비스의 기능을 원하며, 데이터·공략·게임 등 기능 중심에 가벼운 감성을 더하는 방향을 제시했다.
- `research/emerging-web-ideas-2026-11-13.md`에 출처·지표 한계와 5개 후보를 작성했다. 우선 검증 제안은 식당 메타 브리핑, 동네 작전판, 블라인드 매치이며 모두 가설이다.
- 국내 신생 제작 서비스의 성장과 출범을 함께 확인하는 추가 조사, 팀의 후보 선택, 사용자 실험, API 계약·운영 권한 확인이 남았다. 실 서비스·신청·집계는 진행하지 않았다. forge 결과는 여전히 없다.

## 2026-11-13 영토·메뉴 도감 아이디어 검토
- 사용자 제안에 따라 `research/팀-아이디어-검토-2026-11-13.md`에 팀 전달용 검토를 작성했다. 영토·메뉴 도감·제철·동물 캐릭터·사진보다 결제 지표 중심 탐색 및 국내외 사례를 정리했다. 메뉴 도감과 개인 영토 지도의 결합을 잠정 논의안으로 제시했으며 주제 확정·사용자 검증은 아니다.
- 공식 스킬은 결제 기반 매출 백분위와 추정 영업시간을 설명하며 개인 결제 내역·특정 메뉴 판매 여부를 보장하지 않는다. 상세 URL 및 운영 권한은 기존 차단 사항 참조.
- contest-idea-forge 재실행은 Claude 세션 한도 429로 추출 단계 실패, 23:50 KST 재설정 안내. 신규 forge 아이디어·검증 결과가 없어서 해당 파이프라인 기반 추가 발상은 미완료. 국내 제작 신생 서비스의 출범·성장 동시 확인도 남았다.

## 2026-11-13 Codex 아이디어 스킬과 팀 문서 보완
- 사용자 지시에 따라 Claude 대신 Codex가 직접 웹 조사·발상·반론 검토하는 `.agents/skills/codex-contest-ideas/SKILL.md`를 만들고 형식 검증했다. `.claude/skills/`에도 정본 링크를 추가. OpenAI GitHub skill-creator와 설치된 시스템 스킬 지침을 참고했다.
- 새 스킬로 `research/팀-아이디어-검토-2026-11-13.md`를 6개 후보와 국내 사례로 갱신했다. 상세 출처·선행 사례는 `research/codex-idea-evidence-2026-11-13.md`. 빙고·도감 조합 우선은 가설이고 Sidequest·Cibo 등 유사 사례가 존재한다.
- Claude forge를 대체 수단으로 필수 재실행하지 않는다. Claude 결과는 없으며 Codex 조사와 혼동하지 않는다. 잇플 실제 데이터·사용자 실험·운영 권한·메뉴 매칭 검증은 미완료.

## 2026-11-13 Codex 스킬 추가 적용
- codex-contest-ideas로 선행 사례 및 잇플 결제 데이터 의미를 다시 확인하고 팀 문서에 점심 항로·식당 정보 블라인드·같이 채우는 제철 식탁을 추가했다. 추천은 항로와 빙고를 가상 데이터로 비교 검증하는 가설이다.
- Sidequest·Cibo·Vota 등 선행 사례와 실험·권한 조건은 `research/codex-idea-evidence-2026-11-13.md`에 기록했다. 후보 선택·실 API 호출·사용자 실험은 아직 하지 않았다.

## 2026-11-13 팀 공유 문체
- `research/팀-아이디어-검토-2026-11-13.md`를 음슴체로 다듬었다. 아이디어·출처·미확인 조건은 유지했으며 팀 주제는 미확정이다.

## 2026-11-13 언인스타 방향 추가
- 사용자가 언인스타 감성 식당 찾기를 제안하여 팀 문서에 독립 후보를 추가함. 음식 사진 위주의 피드보다 확인된 정보로 선택하는 화면이며 식당 자체를 언인스타·노광고·단골집으로 판정하지 않음. 해외 관련 용례와 데이터 제약은 `research/codex-idea-evidence-2026-11-13.md` 참조.

## 2026-11-13 팀 문서 반영
- 사용자 요청으로 기존 팀 Google 문서에 `안성우 아이디어` 탭을 추가하고 로컬 팀 아이디어 문서의 후보·출처를 반영함. 기존 탭 내용은 수정하지 않음.

## 2026-11-23~24 EatsMine 저장소로 이전
- 작업 위치가 `/home/anseongu/projects/EatsMine`(github Suuuuug/EatsMine)로 바뀜. 주제는 EatsMine 기획서 v2.0으로 확정(docs/plan.md).
- 팀원이 `main`에 모노레포(apps/web Next 16 + apps/api NestJS) 세팅을 push. 로컬은 `main` 추적. **Claude 문서·스킬·docs·research는 로컬 전용(`.git/info/exclude`), 우리 코드만 커밋·push.**
- 공모전: 1위 9,039명(11-22). 등록 완료일부터 집계 → 최소판 제출을 11-26 전후로 당기자는 제안(docs/WINNING-STRATEGY.md, 팀 결정 전).
- 스킬 정비 완료(k-skill 7종, eatpl-integration 개선, eatsmine-product-spec 신규, skill-creator 검증). 하네스 구조(서브에이전트 4종, ORCHESTRATION, HARNESS, 작업 계약 템플릿).
- 다음: ① 팀과 일정·NestJS 기준 기획서 §9 갱신·인앱 대응·캐시 정책 합의 ② 잇플 API 접근 경로(k-skill 프록시 허용 여부, AI 필수 여부) 주최 측 문의 여부를 사용자가 결정 ③ 첫 기능 계약 `docs/plans/active/` 작성 후 P0 최소 흐름 구현 ④ 팀원 UI의 StarRating·"Eatpl" 명칭 이슈를 팀원에게 전달.
- 상세: docs/daily-log/2026-11-23.md.

## 2026-11-24 Supabase CLI 마이그레이션 (feat/mypage)
- 사용자는 마이페이지(/my) 담당. 작업 브랜치 `feat/mypage`(origin에 push됨, 65918f7).
- `apps/api/.env` 작성(커밋 안 됨), Supabase 조직 초대 수락 후 `supabase link` 완료(eatsmine-dev). 원격 public 비어 있음, 마이그레이션 이력 없음.
- 마이그레이션은 Drizzle 생성 → supabase/migrations 복사 → Supabase CLI 적용. 사용법 `supabase/README.md`. 팀원이 만든 `db:migrate`(drizzle) 동작을 바꿨으므로 PR에서 팀원 합의 필요.
- 다음: PR 생성 여부 사용자 확인 → 마이페이지 작업 계약(`docs/plans/active/my-page.md`) 작성 → /my 첫 화면과 필요한 테이블(user_region_visits 등) 스키마.

## 2026-11-24 선 아이콘 세트
- 요청한 신규 파일 5개 작성. 원본 선은 apps/web/scripts/build-icons.mjs 한 곳, sprite·파비콘·names.ts 생성. 남한 경로 브랜드/영토 공유, CC BY 저자·변경·출처 표기.
- 지정 생성/eslint/tsc 통과 + 생성기 eslint 및 재현성 확인. 24/32/96px·파비콘 32px Sharp 시각 확인.
- 미검증: 브라우저 외부 use와 favicon 선택(도구 승인 정책 차단). 기존 화면에 연결하는 변경은 요청 범위 밖. 커밋/push 없음.

## 2026-11-24 Codex 마이페이지 인수
- /my의 모바일 상단 브랜드 툴바와 PC 섹션 사이드바, 반응형 로그인 버튼 배치를 조정했다. 공개 설정·공유는 ERD와 API 미구현 상태를 반영해 준비 중으로 표시한다. 예시 데이터이며 DB/API 연결은 없다.
- 독립 평가 최종 모바일/PC 8/8, 세 폭 넘침·로그인 안내·PC 앵커 확인, 전체 lint/build 통과. 실제 로그인·실기기 및 이동 목적지는 미검증. 제목·스크롤 브랜드 대안의 독립 실화면 비교는 브라우저 충돌로 미완료.
- 기존 작업 전체 미커밋. 다음에는 팀의 인증/API 및 공유 권한 계약이 정해지면 실제 데이터·설정·공유를 연결한다. 세부: docs/plans/active/my-page.md.

## 2026-11-24 마이페이지 반응형 재검토
- 배경을 끊던 상단·사이드바 선을 없애고 PC 두 열·메뉴 글자 크기를 조정했다. 모바일 상단은 사용자 요청으로 고정하지 않는다.
- 독립 평가 모바일 8.5/PC 8.3, Playwright 세 폭 넘침·로그인 안내·PC 앵커·키보드 검증, lint/build 통과. 홈은 기본 화면, 도감 404, 뒤로 가기 포커스 BODY, 실기기·실제 로그인 미검증. WSLg PC Chrome 실행. 기존 작업 모두 미커밋.

## 2026-11-24 유리·정렬 및 백엔드 연결 검토
- /my와 /my/preview의 패널 구분과 유리 재질, 모바일·PC 레이아웃을 수정했다. PC 상단 제목 y48 및 첫 패널 y100을 두 열에서 맞췄다. 독립 시각 평가 네 화면 8.3, WSLg headed Chrome Playwright 조작·lint·build 통과. 캡처 및 남은 제한은 docs/design/review-log.md.
- 실제 인증·DB/API는 미구현이고 도감은 404다. 후속 프로필·후기 조회, 인증·소유권·공유 계약은 docs/plans/active/my-page.md를 참고. 코드 미커밋.

## 2026-11-24 마이페이지 코드·스크린샷 푸시
- 사용자 요청으로 README에 비로그인·로그인 예시 모바일/PC 캡처 4장을 추가하고 코드와 함께 `feat/mypage`에 커밋 `35bc1c6`, origin에 push했다. README는 루트에 신규 생성. 로컬 전용 문서·스킬은 제외했다.
- 커밋 전 독립 리뷰·Codex gpt-6.1-sol 리뷰, 전체 lint/build, 스크린샷 확인. Codex는 도감 404 및 홈 기본 페이지 지적: 팀원 화면 미병합이며 사용자와 정한 진입 링크를 보존하고 README에 제한 명시. 실제 로그인·실기기·잇플 연동 미검증.

## 2026-11-24 디자인 시스템·스타일 가이드
- SVG 키트를 apps/web/public/images와 단일 아이콘 스프라이트로 배치, tokens.css·@/components/em 19개·/styleguide(사이드바, 모바일 하단 탭 바 + 칩 줄) 완성. 규칙은 docs/DESIGN.md §2·§7~§10(HIG·Material 3·SEED 근거), 계약 docs/plans/active/design-system.md.
- AI 활용 문서도 커밋·push하기로 결정 변경(AGENTS.md Git 절). 백엔드 방식은 미정, 부품은 props만 받는다.
- 재개 지점: 커밋·push는 메인이 진행. 프로토타입 HTML과 Claude Design System 아티팩트(https://claude.ai/artifact/CfahhRk5J9p868swYuryLN) 내용은 메인이 채움.
- 미검증: 실기기, 768px 독립 평가 점수, 카카오 지도 연동, 정식 경계(rebuild_maps.py 미실행), 팀원 도감·지도 화면 미병합.
- 후속(같은 날): 검토 반영 후 코드·문서 커밋·push. 아티팩트 링크는 docs/plans/active/design-system.md. 팀 공유는 아티팩트 Share 메뉴에서 사용자가 직접.
