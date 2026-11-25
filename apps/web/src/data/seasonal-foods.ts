import { seasonNames } from "@/lib/assets/catalog";
import type { SeasonKey, SeasonalFoodItem } from "@/types/dictionary";
import seedFoods from "./dictionary-foods.json";
import { FOOD_ILLUSTRATIONS } from "./food-illustrations";
import { formatFoodMonths, seasonsForMonths } from "./food-seasons";

export const SEASON_TABS: { key: SeasonKey; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "spring", label: seasonNames.spring },
  { key: "summer", label: seasonNames.summer },
  { key: "autumn", label: seasonNames.autumn },
  { key: "winter", label: seasonNames.winter },
];

// 로그인 연동 전의 예시예요. 실제 사용자 수집 기록이 아니에요.
export const SAMPLE_COLLECTED_FOOD_IDS: string[] = [
  "yellowtail-sashimi", "fresh-oysters", "strawberry-dessert",
  "blue-crab", "bingsu", "grilled-prawns", "red-bean-porridge",
];

// apps/api/data/foods.json에서 필요한 필드만 그대로 옮긴 프론트 스냅샷이에요.
// 원본이 바뀌면 dictionary-foods.test.mjs의 동등성 검사가 갱신 누락을 알려줘요.
export const SEASONAL_FOODS: SeasonalFoodItem[] = seedFoods.map((food) => {
  const slug = FOOD_ILLUSTRATIONS[food.name as keyof typeof FOOD_ILLUSTRATIONS];
  return {
    id: slug,
    name: food.name,
    src: `/images/foods/${slug}.svg`,
    months: food.months,
    seasons: seasonsForMonths(food.months),
    seasonLabel: formatFoodMonths(food.months),
    description: food.description,
    regions: food.regions,
    keywords: [food.searchKeyword],
  };
});
