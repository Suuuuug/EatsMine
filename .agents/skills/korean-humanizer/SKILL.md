---
name: korean-humanizer
description: "AI가 쓴 티가 나는 한국어 글을 의미를 보존한 채 자연스럽게 고친다. EatsMine의 화면 문구, 도감·테마 랜딩 설명, 에브리타임·인스타그램 홍보 글, 공모전 신청서·소개 문구, 팀 공유 문서를 다듬을 때 사용한다."
---

# korean-humanizer (EatsMine 적용판)

> 출처: [NomaDamas/k-skill](https://github.com/NomaDamas/k-skill) `korean-humanizer/` (MIT, 커밋 `c41a117`, 2026-11-23 가져옴). 원본 본문은 이 폴더의 `instruction.md`, 원본 SKILL.md는 `UPSTREAM-SKILL.md`, 라이선스는 `LICENSE.k-skill`. 원본은 `npx @nomadamas/k-skill@0 instruct`로 최신 지침을 받으라고 하지만, 고정되지 않은 외부 코드를 실행하게 되므로 EatsMine에서는 이 폴더의 고정본을 읽는다. 갱신이 필요하면 원본 저장소에서 다시 받아 diff를 확인한다.

## EatsMine에서 쓰는 법

- 기획서 §15 홍보 콘텐츠와 §5 테마 랜딩은 "실제 취재/확인한 고유 설명"이어야 하고, 내용이 빈약한 자동 생성 페이지 양산은 금지다. 이 스킬은 문장을 다듬는 도구이지 내용을 만들어내는 도구가 아니다. 사실·수치·식당명·출처는 바꾸지 않는다.
- 잇플 데이터 문구(`전국 매출 상위 0.04%`, `영업 예상 시간`, `eat.pl 잇플 · BC카드 결제 데이터 기반`)는 정해진 표현이므로 윤문 대상에서 뺀다.
- 원본 본문이 길다(instruction.md 약 31KB). 탐지 카탈로그는 `references/ai-tell-taxonomy.md`에 있다.

## 원본 지침

작업 전에 이 폴더의 `instruction.md`을 읽고 따른다. 위 "EatsMine에서 쓰는 법"과 충돌하면 이 파일이 우선한다.
