---
name: korean-privacy-terms
description: "Next.js App Router 프로젝트에 한국 법령 기반 개인정보처리방침·이용약관·쿠키 배너·회원가입 동의 모달 초안을 만들 때 사용한다. EatsMine의 /about 정책 페이지, Supabase 로그인·리뷰·방문기록·공유(P1) 도입, 분석 이벤트 수집 고지를 만들거나 고칠 때 참조한다."
---

# korean-privacy-terms (EatsMine 적용판)

> 출처: [NomaDamas/k-skill](https://github.com/NomaDamas/k-skill) `korean-privacy-terms/` (MIT, 커밋 `c41a117`, 2026-11-23 가져옴). 원본 본문은 이 폴더의 `instruction.md`, 원본 SKILL.md는 `UPSTREAM-SKILL.md`, 라이선스는 `LICENSE.k-skill`. 원본은 `npx @nomadamas/k-skill@0 instruct`로 최신 지침을 받으라고 하지만, 고정되지 않은 외부 코드를 실행하게 되므로 EatsMine에서는 이 폴더의 고정본을 읽는다. 갱신이 필요하면 원본 저장소에서 다시 받아 diff를 확인한다.

## EatsMine에서 쓰는 법

- EatsMine은 기획서 §3 `/about`에 정책·문의, §10·§14에 개인정보 최소 수집·탈퇴 시 삭제·이벤트 보존기간을 요구한다. 로그인·리뷰·방문기록(P1)을 켜기 전에 이 스킬로 처리방침·약관 초안을 만든다. P0의 비식별 이벤트 수집도 처리방침에 적는다.
- 생성물은 **참고용 초안이며 법률 자문이 아니다.** 실서비스 노출 전 팀이 검토하고, 필요하면 전문가 검토를 받는다.
- 원본 instruction.md는 먼저 인터뷰부터 하라고 한다. 수집 항목은 기획서 §10 테이블(profiles, reviews, user_region_visits, user_food_collection, share_links, outbound_events)과 실제 구현을 기준으로 답한다. 구현에 없는 수집 항목을 미리 넣지 않는다.
- **설치 스크립트(`scripts/install.sh`)는 외부 저장소 `kimlawtech/korean-privacy-terms`(Apache-2.0)를 고정 SHA로 clone한다.** 실행 전 사용자에게 확인받는다. 업스트림 payload는 이 저장소에 커밋하지 않는다.
- 고정본 instruction.md(약 118행)는 업스트림 pin의 한국어 약관 템플릿이 0바이트일 수 있다고 경고한다. 인터뷰 전에 설치본에서 한국어 템플릿 파일 크기를 확인하고, 비어 있으면 수동 초안이나 검증된 다른 pin으로 간다. 설치 스크립트는 홈 디렉터리(`~/.cache/k-skill/`, `~/.claude/skills/`, `~/.agents/skills/`)에 쓰고 기존 upstream 체크아웃을 교체할 수 있으니 변경 경로를 사용자에게 먼저 알린다.
- 원본 instruction.md의 `npx ... exec` 대신 이 폴더의 `scripts/install.sh`를 직접 읽고 실행한다.

## 원본 지침

작업 전에 이 폴더의 `instruction.md`을 읽고 따른다. 위 "EatsMine에서 쓰는 법"과 충돌하면 이 파일이 우선한다.
