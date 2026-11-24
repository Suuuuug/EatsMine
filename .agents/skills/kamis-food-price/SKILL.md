---
name: kamis-food-price
description: "KAMIS 농수축산물 도소매 가격과 전일·주간·월간·연간 비교값을 조회할 때 사용한다. EatsMine에서 제철음식 도감(P1-01)이나 '이번 달 제철음식' 테마 콘텐츠(P1-05, 홍보 §15)에 시세 근거를 붙이거나 제철 후보를 고를 때 참조한다."
---

# kamis-food-price (EatsMine 적용판)

> 출처: [NomaDamas/k-skill](https://github.com/NomaDamas/k-skill) `kamis-food-price/` (MIT, 커밋 `c41a117`, 2026-11-23 가져옴). 원본 본문은 이 폴더의 `instruction.md`, 원본 SKILL.md는 `UPSTREAM-SKILL.md`, 라이선스는 `LICENSE.k-skill`. 원본은 `npx @nomadamas/k-skill@0 instruct`로 최신 지침을 받으라고 하지만, 고정되지 않은 외부 코드를 실행하게 되므로 EatsMine에서는 이 폴더의 고정본을 읽는다. 갱신이 필요하면 원본 저장소에서 다시 받아 diff를 확인한다.

## EatsMine에서 쓰는 법

- 시세는 식재료 가격이지 식당 메뉴 가격이 아니다. 화면에서 둘을 섞지 않는다.
- P1 이후 기능이다. P0 전에는 콘텐츠 기획 참고로만 쓴다.
- 서비스에 시세를 표시하려면 KAMIS Open API 이용 조건을 확인하고 팀 키로 서버에서 호출하거나, 조사일과 출처(KAMIS)를 붙인 정적 데이터로 쓴다. k-skill 프록시에 실서비스 트래픽을 붙이지 않는다.
- `scripts/run_kamis.py`는 표준 라이브러리만 쓰는 조회 스크립트다. 개발 중 실행은 `python3 -I`로 한다.

## 원본 지침

작업 전에 이 폴더의 `instruction.md`을 읽고 따른다. 위 "EatsMine에서 쓰는 법"과 충돌하면 이 파일이 우선한다.
