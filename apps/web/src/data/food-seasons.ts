/** 시드의 개월 목록으로 계절 탭을 계산해요. 한 음식이 여러 탭에 속할 수 있어요. */
export const SEASON_MONTHS = {
  spring: [3, 4, 5],
  summer: [6, 7, 8],
  autumn: [9, 10, 11],
  winter: [12, 1, 2],
} as const;

export function seasonsForMonths(months: readonly number[]) {
  return (Object.keys(SEASON_MONTHS) as (keyof typeof SEASON_MONTHS)[]).filter(
    (season) => months.some((month) => (SEASON_MONTHS[season] as readonly number[]).includes(month)),
  );
}

/** 순서와 빠진 달을 유지해요. 범위로 줄여서 없는 달을 포함하지 않아요. */
export function formatFoodMonths(months: readonly number[]) {
  return months.map((month) => `${month}월`).join(", ");
}
