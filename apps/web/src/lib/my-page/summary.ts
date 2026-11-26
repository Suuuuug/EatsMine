import { orderByMonth } from "../../data/food-seasons.ts";
/** 영토·도감 요약 줄의 숫자 문구와 미리보기 타일 고르기. 순수 함수라 화면과 따로 테스트한다. */

export function territorySummary(owned: number, total: number): string {
  return owned > 0 ? `전국 ${total}곳 중 ${owned}곳을 칠했어요` : "아직 칠한 곳이 없어요";
}

/** 수집한 음식을 먼저, 모자라면 아직 못 모은 음식으로 채워 limit개를 돌려준다. */
export function pickPreviewFoods<T extends { id: string }>(
  foods: readonly T[],
  collectedIds: readonly string[],
  limit: number,
): { food: T; collected: boolean }[] {
  const owned = new Set(collectedIds);
  const collected = foods.filter((food) => owned.has(food.id)).map((food) => ({ food, collected: true }));
  const rest = foods.filter((food) => !owned.has(food.id)).map((food) => ({ food, collected: false }));
  return [...collected, ...rest].slice(0, limit);
}

type SeasonFood = { id: string; seasons: readonly string[]; months: readonly number[] };

/**
 * 마이 "내 도감"의 이번 계절 진행 상황. 분류(계절)는 절기, 지금 먹을 수 있는지는 달로 본다.
 * - total·collected: 이번 절기 계절 탭의 음식 기준(도감 탭 숫자와 같다).
 * - next(다음 행동): 이번 계절 중 이번 달 제철 → 다른 계절이라도 이번 달 제철 → 이번 계절의 나머지 순으로
 *   아직 못 모은 음식 하나. 계절이 바뀌는 달에도 지금 먹을 수 있는 음식을 권한다.
 * - preview: 이번 계절 음식. 모은 것을 앞에, 나머지는 이번 달 제철을 앞에 둔다.
 * 전체 도감은 도감 탭이 맡으므로 마이는 이 요약과 다음 행동만 보여 준다.
 */
export function seasonProgress<T extends SeasonFood>(
  foods: readonly T[],
  collectedIds: readonly string[],
  season: string,
  limit = 10,
  month = 0,
): { total: number; collected: number; next: T | null; preview: { food: T; collected: boolean }[] } {
  const owned = new Set(collectedIds);
  const notOwned = (food: T) => !owned.has(food.id);
  const inSeason = orderByMonth(foods.filter((food) => food.seasons.includes(season)), month);
  const thisMonth = (food: T) => month > 0 && food.months.includes(month);
  const next =
    inSeason.find((food) => notOwned(food) && thisMonth(food)) ??
    foods.find((food) => notOwned(food) && thisMonth(food)) ??
    inSeason.find(notOwned) ??
    null;
  return {
    total: inSeason.length,
    collected: inSeason.filter((food) => owned.has(food.id)).length,
    next,
    preview: pickPreviewFoods(inSeason, collectedIds, limit),
  };
}

/** 도감 음식 상세(그 음식의 식당 찾기가 있는 곳). 마이의 음식 칸과 다음 음식 버튼이 같은 곳으로 간다. */
export function foodDetailHref(foodId: string): string {
  return `/dictionary?food=${encodeURIComponent(foodId)}`;
}
