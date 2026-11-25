import type { MyPageData } from "@/types/my-page";

// 예시 데이터. 로그인과 API가 생기기 전까지 마이페이지 모양을 보여 주는 용도다.
// 화면에는 isSample로 "예시"라고 밝힌다. 식당 이름은 지어낸 것이고 잇플 링크는 넣지 않는다.
export const SAMPLE_MY_PAGE: MyPageData = {
  isSample: true,
  profile: {
    id: "sample-user",
    nickname: "먹깨비",
    avatar_url: null,
    created_at: "2026-11-02T10:12:00+09:00",
  },
  regionVisits: [
    { region_id: 11680, region_name: "서울 강남구", first_visited_at: "2026-11-03" },
    { region_id: 41110, region_name: "수원시", first_visited_at: "2026-11-09" },
    { region_id: 26350, region_name: "부산 해운대구", first_visited_at: "2026-11-15" },
    { region_id: 30140, region_name: "대전 중구", first_visited_at: "2026-11-21" },
  ],
  foodCollection: [
    { food_id: 1, food_name: "딸기", collected_at: "2026-11-15" },
    { food_id: 2, food_name: "감", collected_at: "2026-11-15" },
    { food_id: 3, food_name: "굴", collected_at: "2026-11-16" },
    { food_id: 4, food_name: "귤", collected_at: "2026-11-18" },
    { food_id: 5, food_name: "옥수수", collected_at: "2026-11-19" },
    { food_id: 6, food_name: "고구마", collected_at: "2026-11-20" },
    { food_id: 7, food_name: "무", collected_at: "2026-11-22" },
  ],
  reviews: [
    {
      id: "r3",
      restaurant_id: "s3",
      restaurant_name: "은행동 칼국수",
      mer_url: null,
      rating: 4,
      content: "바지락이 넉넉하고 국물이 맑아요. 점심에는 줄이 길어서 열한 시 반쯤 가는 게 좋아요.",
      visited_at: "2026-11-21",
      visibility: "private",
      created_at: "2026-11-21T13:40:00+09:00",
    },
    {
      id: "r2",
      restaurant_id: "s2",
      restaurant_name: "해운대 방어회 식당",
      mer_url: null,
      rating: 5,
      content: "11월 대방어라 기름이 올라 있었어요. 두 명이면 중자로 충분해요.",
      visited_at: "2026-11-15",
      visibility: "public",
      created_at: "2026-11-15T20:05:00+09:00",
    },
    {
      id: "r1",
      restaurant_id: "s1",
      restaurant_name: "장안문 순댓국",
      mer_url: null,
      rating: 3,
      content: "순대는 좋았는데 국물이 조금 짰어요.",
      visited_at: "2026-11-09",
      visibility: "private",
      created_at: "2026-11-09T12:30:00+09:00",
    },
  ],
};
