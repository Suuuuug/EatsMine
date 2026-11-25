import { seasonForDate, type Season } from "../lib/theme/theme.ts";

/*
 * 도감 계절 탭은 절기(입춘 2/4·입하 5/5·입추 8/7·입동 11/7)로 깔끔하게 넷으로 나눠요.
 * 음식 하나는 탭 하나에만 들어가요. 시드는 제철을 달로 적어 두었으므로,
 * 각 달을 그 달 15일이 속한 절기 계절로 바꾼 뒤 가장 많이 걸친 계절을 고르고,
 * 같으면 제철이 시작되는(먼저 적힌) 달의 계절을 골라요.
 */
const seasonOfMonth = (month: number): Season => seasonForDate(month, 15);

export function seasonsForMonths(months: readonly number[]): Season[] {
  if (months.length === 0) return [];
  const counts = new Map<Season, number>();
  for (const month of months) {
    const season = seasonOfMonth(month);
    counts.set(season, (counts.get(season) ?? 0) + 1);
  }
  const most = Math.max(...counts.values());
  const first = months.map(seasonOfMonth).find((season) => counts.get(season) === most);
  return first ? [first] : [];
}

/** 순서와 빠진 달을 유지해요. 범위로 줄여서 없는 달을 포함하지 않아요. */
export function formatFoodMonths(months: readonly number[]) {
  return months.map((month) => `${month}월`).join(", ");
}

/**
 * 탭(분류)은 절기, 지금 먹을 수 있는지는 달로 본다. 탭 안에서 이번 달에 제철인 음식을 앞으로 옮기고
 * 나머지 순서는 그대로 둔다. month가 0이면(서버 렌더처럼 날짜를 모를 때) 순서를 바꾸지 않는다.
 */
export function orderByMonth<T extends { months: readonly number[] }>(foods: readonly T[], month: number): T[] {
  if (!month) return [...foods];
  const now = foods.filter((food) => food.months.includes(month));
  const later = foods.filter((food) => !food.months.includes(month));
  return [...now, ...later];
}
