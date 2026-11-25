<div align="center">

<img src="apps/web/public/android-chrome-192x192.png" width="96" height="96" alt="EatsMine 아이콘">

# EatsMine

지역과 제철 음식을 골라 맛집을 찾고, 다녀온 곳을 내 영토와 도감으로 모으는 웹 서비스

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js%2016-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React%2019-087EA4?logo=react&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS%204-06B6D4?logo=tailwindcss&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS%2012-E0234E?logo=nestjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?logo=supabase&logoColor=white)
![Drizzle](https://img.shields.io/badge/Drizzle%20ORM-C5F74F?logo=drizzle&logoColor=black)
![Vercel](https://img.shields.io/badge/Vercel-000000?logo=vercel&logoColor=white)

[![EatsMine 열기](https://img.shields.io/badge/Open%20Website-2f7d4f?style=for-the-badge&logo=vercel&logoColor=white)](https://eatsmine.vercel.app/)

</div>

## 화면

<table>
<tr>
<th width="33%">지도</th>
<th width="33%">도감</th>
<th width="33%">마이페이지</th>
</tr>
<tr>
<td><img src="assets/readme/map-pc-light.png" alt="지도 화면"></td>
<td><img src="assets/readme/dictionary-pc-light.png" alt="도감 화면"></td>
<td><img src="assets/readme/my-pc-light.png" alt="마이페이지 화면"></td>
</tr>
</table>

## 구성

| 폴더 | 내용 |
| --- | --- |
| `apps/web` | Next.js 웹 (지도, 도감, 마이페이지) |
| `apps/api` | NestJS API, Drizzle, Supabase Postgres |
| `supabase` | DB 마이그레이션 |

## 실행

Node.js 22 이상. `apps/web/.env.example`, `apps/api/.env.example`을 참고해 환경변수를 채웁니다.

```bash
npm install
npm run dev      # 웹 :3000, API :4000
```
