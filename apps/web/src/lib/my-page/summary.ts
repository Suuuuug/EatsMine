/** 영토·도감 요약 줄의 숫자 문구와 미리보기 타일 고르기. 순수 함수라 화면과 따로 테스트한다. */

export function territorySummary(owned: number, total: number): string {
  return `${total}곳 중 ${owned}곳`;
}

export function collectionSummary(owned: number, total: number): string {
  return `${total}종 중 ${owned}종`;
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
