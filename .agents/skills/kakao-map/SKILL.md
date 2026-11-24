---
name: kakao-map
description: "카카오 Local API로 장소 키워드 검색, 주소↔좌표 변환, 좌표→행정구역 변환을 할 때 사용한다. EatsMine에서 잇플 결과의 주소를 지도 마커 좌표로 바꾸거나(P0-03 지오코딩), 지역 선택값을 행정구역 코드에 맞추거나, 개발 중 장소 주소를 확인할 때 참조한다."
---

# kakao-map (EatsMine 적용판)

> 출처: [NomaDamas/k-skill](https://github.com/NomaDamas/k-skill) `kakao-map/` (MIT, 커밋 `c41a117`, 2026-11-23 가져옴). 원본 본문은 이 폴더의 `instruction.md`, 원본 SKILL.md는 `UPSTREAM-SKILL.md`, 라이선스는 `LICENSE.k-skill`. 원본은 `npx @nomadamas/k-skill@0 instruct`로 최신 지침을 받으라고 하지만, 고정되지 않은 외부 코드를 실행하게 되므로 EatsMine에서는 이 폴더의 고정본을 읽는다. 갱신이 필요하면 원본 저장소에서 다시 받아 diff를 확인한다.

## EatsMine에서 쓰는 법

- 기획서 P0-03은 API 응답에 좌표가 없거나 맞지 않으면 **정식 지도 API로 지오코딩**하라고 한다. 주의: instruction.md의 표는 **k-skill 프록시 계약**(`/v1/kakao-map/*`, `q` 등)이다. 직접 호출 코드는 [카카오 Local 공식 문서](https://developers.kakao.com/docs/ko/local/dev-guide)의 경로·파라미터를 따른다. 예: 주소→좌표 `GET https://dapi.kakao.com/v2/local/search/address.json?query=`, 키워드 `/v2/local/search/keyword.json?query=`, 좌표→주소 `/v2/local/geo/coord2address.json`, 좌표→행정구역 `/v2/local/geo/coord2regioncode.json`, 헤더 `Authorization: KakaoAK <REST키>`. 구현 전 공식 문서로 다시 확인한다.
- **실서비스에서는 k-skill 프록시가 아니라 팀이 발급한 카카오 REST API 키로 `apps/api`(NestJS) 서버에서 직접 호출한다.** 키는 서버 환경변수(`KAKAO_REST_API_KEY` 등, `NEXT_PUBLIC_` 금지)로만 둔다. 지도 렌더링용 JavaScript 키는 별도이며 도메인 제한을 건다. 지도 제공자는 아직 팀 결정 전이다(기획서 §9 "지도 제공자 공식 SDK/API").
- 같은 이름의 다른 가게를 잇지 않도록 상호 + 주소를 같이 대조한다. 매칭에 실패하면 카드는 보여주되 마커만 생략한다.
- 대량 인덱싱·결과 장기 저장은 카카오 약관과 일일 쿼터 문제가 있다. 지역 단위 캐시는 짧게 둔다.
- 자동차 길찾기(Kakao Mobility)는 EatsMine 범위 밖이다(P2 코스·경로 이전에는 쓰지 않는다).

## 원본 지침

작업 전에 이 폴더의 `instruction.md`을 읽고 따른다. 위 "EatsMine에서 쓰는 법"과 충돌하면 이 파일이 우선한다.
