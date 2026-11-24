---
name: bccard-eatpl-search
description: "BC카드 eat.pl 잇플 맛집 검색 API의 원본 계약(입력 파라미터, merUrl·allSaleRnk·ccgSaleRnk·srtTime/endTime 의미, TM128 좌표, 401/403/502/503 실패 모드, 출처 문구)을 확인해야 할 때 사용한다. EatsMine에서 lib/eatpl 클라이언트·정규화 코드를 짜거나, 응답 필드 매핑이 불확실하거나, 개발 중 실제 검색 결과를 표로 확인할 때 참조한다. 서비스 구현 규칙 자체는 eatpl-integration 스킬이 정본이다."
---

# bccard-eatpl-search (EatsMine 적용판)

> 출처: [NomaDamas/k-skill](https://github.com/NomaDamas/k-skill) `bccard-eatpl-search/` (MIT, 커밋 `c41a117`, 2026-11-23 가져옴). 원본 본문은 이 폴더의 `instruction.md`, 원본 SKILL.md는 `UPSTREAM-SKILL.md`, 라이선스는 `LICENSE.k-skill`. 원본은 `npx @nomadamas/k-skill@0 instruct`로 최신 지침을 받으라고 하지만, 고정되지 않은 외부 코드를 실행하게 되므로 EatsMine에서는 이 폴더의 고정본을 읽는다. 갱신이 필요하면 원본 저장소에서 다시 받아 diff를 확인한다.

## EatsMine에서 쓰는 법

- **이 스킬은 API 계약의 원본 참고서다.** 화면·라우트·링크 규칙은 `eatpl-integration`을 따른다. 둘이 다르면 원본 계약(이 스킬)이 사실의 기준이고, 표현 규칙은 eatpl-integration이 기준이다.
- instruction.md의 "사용자 답변 규칙"과 "출력 계약(마크다운 표)"은 **채팅으로 맛집을 추천할 때**의 규칙이다. EatsMine 화면에 그대로 옮기지 않는다. 다만 그 안의 데이터 해석 규칙은 화면에도 적용한다:
  - 백분위는 낮을수록 상위, 1% 미만 소수점 보존(`전국 매출 상위 0.04%`).
  - `srtTime`/`endTime`은 `영업 예상 시간`, 자정 넘김은 `익일`.
  - `merUrl`이 없거나 `https://web.paybooc.ai/`로 시작하지 않으면 그 매장을 표시하지 않는다.
  - **좌표는 TM128이다.** WGS84 지도(카카오·네이버 등) 마커에 그대로 쓰지 않는다. 변환하거나 `kakao-map`으로 지오코딩한다(기획서 P0-03).
- `k-skill-proxy.nomadamas.org`는 k-skill 운영자의 공개 프록시이고 원본 면책 고지는 개인 조회 용도로 한정한다. EatsMine 실서비스 트래픽을 이 프록시에 붙이기 전에 대회 측이 허용한 경로인지 확인한다(docs/BLOCKERS.md). 개발 중 수동 확인은 저빈도로만 호출한다.
- 기관코드·relay 토큰 같은 값은 사용자에게 묻거나 출력하지 않는다.
- instruction.md Workflow 5단계(카카오맵 평점 헬퍼 `scripts/kakao-place-rating.mjs`)는 공개 검색 페이지 스크래핑이다. EatsMine 작업에서는 **개발 중 확인을 포함해 실행하지 않는다.** 결과 확인은 승인된 API의 허용 필드만 쓴다. 별점 표시는 기획서 범위 밖이다.

## 원본 지침

작업 전에 이 폴더의 `instruction.md`을 읽고 따른다. 위 "EatsMine에서 쓰는 법"과 충돌하면 이 파일이 우선한다.
