// EatsMine SVG 키트 자산 목록. 파일은 apps/web/public/images/ 아래에 있다.
// 이름·계절 분류는 그림 소재의 예시 분류다. 실제 제철 데이터는 출처를 확인한 뒤 따로 연결한다.
import foodManifest from "../../../public/images/foods/manifest.json";

export type Season = "spring" | "summer" | "autumn" | "winter";

export type FoodAsset = { id: string; name: string; season: Season; src: string };

export const foods = foodManifest as FoodAsset[];

export const seasonNames: Record<Season, string> = {
  spring: "봄",
  summer: "여름",
  autumn: "가을",
  winter: "겨울",
};

export type BadgeId = "first-visit" | "first-food" | "reviewer" | "regional-master" | "seasonal-master" | "all-korea";

/** 배지 그림과 이름. 받는 조건은 기획 확정 전이라 이름만 둔다. */
export const badges: { id: BadgeId; name: string }[] = [
  { id: "first-visit", name: "첫 방문" },
  { id: "first-food", name: "첫 음식" },
  { id: "reviewer", name: "후기 남기기" },
  { id: "regional-master", name: "지역 다 칠하기" },
  { id: "seasonal-master", name: "제철 다 모으기" },
  { id: "all-korea", name: "전국 한 바퀴" },
];

export type MarkerKind = "restaurant" | "selected" | "visited" | "unvisited";

export const markers: { kind: MarkerKind; name: string }[] = [
  { kind: "restaurant", name: "식당" },
  { kind: "selected", name: "고른 식당" },
  { kind: "visited", name: "다녀온 곳" },
  { kind: "unvisited", name: "아직 안 간 곳" },
];
