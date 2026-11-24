import { foods as catalogFoods, seasonNames } from "@/lib/assets/catalog";
import type { SeasonKey, SeasonalFoodItem } from "@/types/dictionary";

// 계절 필터 탭
export const SEASON_TABS: { key: SeasonKey; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "spring", label: seasonNames.spring },
  { key: "summer", label: seasonNames.summer },
  { key: "autumn", label: seasonNames.autumn },
  { key: "winter", label: seasonNames.winter },
];

// 백엔드·로그인 연동 전 예시 수집 음식 (스타일가이드 예시와 동일하게 맞춤)
export const SAMPLE_COLLECTED_FOOD_IDS: string[] = [
  "strawberry",
  "persimmon",
  "oyster",
  "tangerine",
  "corn",
  "sweet-potato",
  "radish",
];

// 공식 음식 SVG 20종(foods/manifest.json)별 제철 시기 및 대표 추천 지역 메타데이터 (예시)
const FOOD_META: Record<
  string,
  { seasonLabel: string; regions: string[]; keywords: string[] }
> = {
  strawberry: {
    seasonLabel: "2~4월",
    regions: ["논산시", "담양군"],
    keywords: ["딸기", "디저트", "카페"],
  },
  "wild-greens": {
    seasonLabel: "3~4월",
    regions: ["홍성군", "서산시"],
    keywords: ["냉이", "봄나물", "된장국"],
  },
  chives: {
    seasonLabel: "3~4월",
    regions: ["태안군", "서산시"],
    keywords: ["달래", "봄나물", "한식"],
  },
  crab: {
    seasonLabel: "4~5월",
    regions: ["태안군", "옹진군", "서천군"],
    keywords: ["꽃게", "간장게장", "해산물"],
  },
  asparagus: {
    seasonLabel: "4~6월",
    regions: ["양구군", "춘천시"],
    keywords: ["아스파라거스", "채소", "양식"],
  },
  watermelon: {
    seasonLabel: "6~8월",
    regions: ["고창군", "함안군"],
    keywords: ["수박", "과일", "여름"],
  },
  peach: {
    seasonLabel: "7~8월",
    regions: ["이천시", "영동군", "경산시"],
    keywords: ["복숭아", "디저트", "과일"],
  },
  corn: {
    seasonLabel: "6~8월",
    regions: ["제주시", "강릉시", "홍천군"],
    keywords: ["옥수수", "초당옥수수", "간식"],
  },
  tomato: {
    seasonLabel: "6~8월",
    regions: ["광주시", "화천군"],
    keywords: ["토마토", "브런치", "채소"],
  },
  cucumber: {
    seasonLabel: "5~7월",
    regions: ["천안시", "상주시"],
    keywords: ["오이", "냉국", "채소"],
  },
  persimmon: {
    seasonLabel: "10~11월",
    regions: ["청도군", "상주시", "영암군"],
    keywords: ["감", "단감", "곶감"],
  },
  shiitake: {
    seasonLabel: "9~11월",
    regions: ["장흥군", "부여군"],
    keywords: ["표고버섯", "버섯전골", "한식"],
  },
  "sweet-potato": {
    seasonLabel: "9~11월",
    regions: ["해남군", "여주시"],
    keywords: ["고구마", "디저트", "간식"],
  },
  chestnut: {
    seasonLabel: "9~10월",
    regions: ["공주시", "부여군"],
    keywords: ["밤", "군밤", "디저트"],
  },
  pear: {
    seasonLabel: "9~11월",
    regions: ["나주시", "천안시"],
    keywords: ["배", "과일", "가을"],
  },
  mackerel: {
    seasonLabel: "9~11월",
    regions: ["부산시", "안동시", "제주시"],
    keywords: ["고등어", "고등어구이", "생선"],
  },
  yellowtail: {
    seasonLabel: "11~2월",
    regions: ["서귀포시", "포항시", "강릉시"],
    keywords: ["방어", "대방어", "횟집"],
  },
  oyster: {
    seasonLabel: "11~2월",
    regions: ["통영시", "여수시", "보령시"],
    keywords: ["굴", "굴국밥", "해산물"],
  },
  tangerine: {
    seasonLabel: "11~2월",
    regions: ["서귀포시", "제주시"],
    keywords: ["귤", "감귤", "디저트"],
  },
  radish: {
    seasonLabel: "11~2월",
    regions: ["제주시", "무안군"],
    keywords: ["무", "소고기무국", "한식"],
  },
};

export const SEASONAL_FOODS: SeasonalFoodItem[] = catalogFoods.map((item) => {
  const meta = FOOD_META[item.id] ?? {
    seasonLabel: seasonNames[item.season],
    regions: [],
    keywords: [item.name],
  };

  return {
    id: item.id,
    name: item.name,
    season: item.season,
    src: item.src,
    seasonLabel: meta.seasonLabel,
    regions: meta.regions,
    keywords: meta.keywords,
  };
});
