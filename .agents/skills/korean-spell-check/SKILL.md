---
name: korean-spell-check
description: "바른한글(부산대 맞춤법 검사기) 공개 표면으로 한국어 문장의 맞춤법·띄어쓰기를 최종 검수한다. EatsMine 팀 내부 문서 교정에 쓰고, 수익화 서비스 화면 문구·홍보물에는 이용 조건이 확인된 경우에만 사용한다."
---

# korean-spell-check (EatsMine 적용판)

> 출처: [NomaDamas/k-skill](https://github.com/NomaDamas/k-skill) `korean-spell-check/` (MIT, 커밋 `c41a117`, 2026-11-23 가져옴). 원본 본문은 이 폴더의 `instruction.md`, 원본 SKILL.md는 `UPSTREAM-SKILL.md`, 라이선스는 `LICENSE.k-skill`. 원본은 `npx @nomadamas/k-skill@0 instruct`로 최신 지침을 받으라고 하지만, 고정되지 않은 외부 코드를 실행하게 되므로 EatsMine에서는 이 폴더의 고정본을 읽는다. 갱신이 필요하면 원본 저장소에서 다시 받아 diff를 확인한다.

## EatsMine에서 쓰는 법

- 검사기 사이트는 비상업적 용도이며 개인·학생 무료라고 안내한다. 사람 주도·저빈도라는 사실만으로 리워드가 걸린 서비스의 화면 문구·홍보물 검수가 비상업적 이용이 되지는 않는다. 그런 용도는 공급자 조건을 확인하기 전에는 외부로 보내지 말고 로컬에서 교정한다(`korean-humanizer` 등). 쓰더라도 **사람이 주도하는 최종 검수에만** 쓰고, EatsMine 서비스 기능(사용자 리뷰 자동 교정 등)이나 빌드·CI에 연결하지 않는다.
- 사용자 개인정보, 신청서의 개인 식별 정보, 비공개 팀 문서를 외부 검사기로 보내지 않는다.
- 원본 instruction.md의 `npx ... exec` 대신 이 폴더의 `scripts/korean_spell_check.py`를 `python3 -I`로 실행한다. 긴 글은 청크로 나눠 간격을 두고 보낸다.

## 원본 지침

작업 전에 이 폴더의 `instruction.md`을 읽고 따른다. 위 "EatsMine에서 쓰는 법"과 충돌하면 이 파일이 우선한다.
