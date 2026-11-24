---
name: korean-holiday-calendar
description: "한국천문연구원 특일 정보로 공휴일·국경일·기념일·24절기·잡절을 조회할 때 사용한다. EatsMine에서 제철음식 도감(P1-01)의 절기 기준, 테마 랜딩(P1-05) 일정, 계절 알림(P2), 홍보 콘텐츠 날짜를 정할 때 참조한다."
---

# korean-holiday-calendar (EatsMine 적용판)

> 출처: [NomaDamas/k-skill](https://github.com/NomaDamas/k-skill) `korean-holiday-calendar/` (MIT, 커밋 `c41a117`, 2026-11-23 가져옴). 원본 본문은 이 폴더의 `instruction.md`, 원본 SKILL.md는 `UPSTREAM-SKILL.md`, 라이선스는 `LICENSE.k-skill`. 원본은 `npx @nomadamas/k-skill@0 instruct`로 최신 지침을 받으라고 하지만, 고정되지 않은 외부 코드를 실행하게 되므로 EatsMine에서는 이 폴더의 고정본을 읽는다. 갱신이 필요하면 원본 저장소에서 다시 받아 diff를 확인한다.

## EatsMine에서 쓰는 법

- 제철음식 도감·테마 랜딩은 P1이다. P0 완료 전에는 콘텐츠 기획 참고로만 쓴다(eatsmine-product-spec 참고).
- 절기 데이터는 개발 중 콘텐츠 작성용으로 저빈도 조회한다. 서비스 런타임에서 쓰려면 팀이 data.go.kr `15012690` 활용신청을 하고 자체 키로 서버에서 호출하거나, 1년치를 정적 JSON으로 만들어 출처를 붙인다. k-skill 프록시에 실서비스 트래픽을 붙이지 않는다.
- 음식과 절기를 잇는 설명은 출처가 있는 내용만 쓴다(기획서 §5 P1-01 "출처가 있는 설명").

## 원본 지침

작업 전에 이 폴더의 `instruction.md`을 읽고 따른다. 위 "EatsMine에서 쓰는 법"과 충돌하면 이 파일이 우선한다.
