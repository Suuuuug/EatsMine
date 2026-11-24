# EatsMine

BC카드 eat.pl(잇플) 수익화 챌린지 참가 서비스입니다. "오늘 뭐 먹지?"에서 시작해 지역과 제철음식을 탐험하고, 실제 식당 상세 정보는 잇플에서 확인하도록 연결합니다.

EatsMine은 BC카드나 잇플의 공식 서비스가 아닙니다.

## 현재 상태

저장소 초기 구성 단계입니다. 서비스 코드, 배포, 실제 잇플 API 연동은 아직 없습니다.

## 문서

- [기획서 v2.0](docs/plan.md): 목표, 화면, P0 요구사항, API 계약, ERD, 일정. 구현 판단의 기준 문서입니다.

## 예정 스택

기획서 §9 초기 권장안이며 확정 전입니다. Next.js(App Router), TypeScript, Tailwind CSS, Supabase(PostgreSQL/Auth), Vercel.

## 브랜치 규칙

- 기능별 브랜치(`feat/explore-map`, `feat/eatpl-api` 등)에서 작업하고 PR로 합칩니다.
- `main`에 직접 push하지 않습니다.
- 환경변수는 `.env.example`만 커밋합니다. 실제 키와 토큰은 커밋하지 않습니다.
