export function validEatplUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'web.paybooc.ai' && !url.port && !url.username && !url.password && /^\/mer\/web\/profile\/[^/]+\/?$/.test(url.pathname) ? value : null;
  } catch { return null; }
}
export function buildRestaurantUrl(base: string, regionCode: string, foodId: string | null): string | null {
  if (!/^\d{5}$/.test(regionCode)) return null;
  const query = new URLSearchParams({ regionCode });
  if (foodId && /^[1-9]\d*$/.test(foodId)) query.set('foodId', foodId);
  return `${base.replace(/\/$/, '')}/restaurants?${query}`;
}
export function parseSearch(search: string): { regionCode: string | null; foodId: string | null; unsupportedFood: boolean } {
  const query = new URLSearchParams(search);
  const rawFood = query.get('foodId') ?? query.get('food');
  return { regionCode: query.get('regionCode'), foodId: rawFood && /^[1-9]\d*$/.test(rawFood) ? rawFood : null, unsupportedFood: !!rawFood && !/^[1-9]\d*$/.test(rawFood) };
}
export function reviewUrl(id: string, regionCode: string, foodId: string | null, restaurantName?: string): string | null {
  if (!/^[A-Za-z0-9_-]+$/.test(id) || !/^\d{5}$/.test(regionCode)) return null;
  const query = new URLSearchParams({ regionCode });
  if (foodId && /^[1-9]\d*$/.test(foodId)) query.set('foodId', foodId);
  const name = restaurantName?.trim();
  if (name && name.length <= 100) query.set('name', name);
  return `/restaurants/${id}/reviews?${query}`;
}
export function regionLabel(region: { code: string; name: string }): string {
  return region.code === '12' ? '전남광주통합특별시' : region.name;
}
export function sortRegions<T extends { code: string; name: string }>(regions: readonly T[]): T[] {
  return [...regions].sort((a, b) => regionLabel(a).localeCompare(regionLabel(b), 'ko'));
}
/** 후기 조회 API에서 받은 집계만 표시하며, 값이 없으면 0점으로 간주하지 않는다. */
export function formatReviewSummary(summary: { average: number; count: number } | null): string | null {
  if (!summary || !Number.isFinite(summary.average) || summary.average < 0 || summary.average > 5 || !Number.isInteger(summary.count) || summary.count < 1) return null;
  return `사용자 평점 ${summary.average.toFixed(1)}점 · 후기 ${summary.count}개`;
}
/** 후기 목록에서 같은 목록의 평균·건수·대표 후기를 계산한다. */
export function summarizeReviews(reviews: readonly { rating: number; text: string }[]): { average: number; count: number; excerpt: string } | null {
  if (!reviews.length || reviews.some((review) => !Number.isFinite(review.rating) || review.rating < 0 || review.rating > 5)) return null;
  return { average: reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length, count: reviews.length, excerpt: reviews[0].text };
}
