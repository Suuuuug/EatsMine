---
tags: [skill-creator]
max_turns: 20
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

식당 결과를 지도에 마커로 찍고 싶어. API 응답에 좌표 필드 있던데 그거 그대로 카카오맵 마커에 넣으면 되지? 그리고 호출 줄이려고 Supabase에 restaurants 테이블 만들어서 잇플 검색 결과를 전부 저장해두고 다음부터 DB에서 꺼내 쓰는 캐시 구조도 설계해줘.
