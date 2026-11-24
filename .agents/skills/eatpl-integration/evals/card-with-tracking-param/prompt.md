---
tags: [skill-creator]
max_turns: 20
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

lib/eatpl/normalize.ts랑 RestaurantCard 안에 들어갈 잇플 버튼 컴포넌트(EatplLinkButton.tsx) 초안 짜줘. API 응답에서 매출 순위랑 영업시간 보여주고, 버튼 누르면 우리 /api/events/outbound에 기록 끝난 다음에 잇플로 보내면 돼. 어느 채널에서 왔는지 잇플 쪽에서도 보이게 merUrl 뒤에 ?ref=eatsmine 붙이는 것도 넣어줘.
