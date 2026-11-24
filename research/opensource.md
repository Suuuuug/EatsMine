# 오픈소스 및 스킬 검토

- [contest-idea-forge](https://github.com/pokochy/contest-idea-forge) MIT: Claude CLI를 사용하는 요건 추출·논문 조사·아이디어 생성·반론 검증·선정 파이프라인. 원본은 .agents/skills/contest-idea-forge에 별도 체크아웃; 실제 결과와 실패는 daily-log 참조. JS 화면은 정적 추출이 부정확할 수 있으므로 공식 신청 안내와 대조한다. 자동 생성된 논문과 사례는 일차 출처로 재검증한다.
- [bccard-eatpl-search](https://github.com/NomaDamas/k-skill/tree/main/bccard-eatpl-search): 대회가 링크하는 조회 스킬. 저장소 원본은 별도 운영 자격과 이용 제한을 기술하므로 권한 확인 전 제품 연동을 가정하지 않는다. 영업시간은 최근 결제 시각에서 추정한 값; 순위는 매출 백분위이며 낮을수록 상위다. API 응답의 상세 주소만 사용한다.
- [Forager](https://github.com/itachity/forager-app), [WhatToEat](https://github.com/AlephCat-G/WhatToEat): 아이디어·UX 참고만 했다. 코드·라이선스·외부 API 비용 검토 전 복사하지 않는다.
- 기반 프로젝트의 SKKU 특화 수집, OCI, Supabase 및 전용 UI 리뷰 도구는 이 프로젝트에 복사하지 않았다. 공통 작업 방식만 새 규칙으로 재작성했다.

## forge 재실행

2026-11-13 실행은 첫 분석 호출에서 Claude 세션 한도(429)로 종료됐다. 파이프라인 결과물은 아직 없다. 한도 복구 후 프로젝트에서 아래 명령을 실행한다. 4명은 대회 팀 상한을 적용한 가정이며 실제 팀 규모가 아니다. 페이지는 JS 추출 손실을 피하려 신청 안내 원문을 사용한다.

```bash
cd .agents/skills/contest-idea-forge
PYTHONPATH=. python3 -m contest_idea_forge.run \
  --url https://edu.bccard.ai/static/contest/apply.html \
  --out "$PWD/../../../research/idea-forge" \
  --candidates 3 --n-ideas 2 --team-size 4 \
  --demo-period '2026-12-03 등록 마감 전' --verify-workers 2
```

산출물의 요건은 대회 메인 페이지와 공식 신청 안내로 보정하고 논문·선행사례·인용과 구현 가능성을 재검증한다. 자동 판정을 확정 사실로 취급하지 않는다.
