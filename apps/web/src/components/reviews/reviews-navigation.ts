export function reviewReturnHref(search: Pick<URLSearchParams, 'get'>): string {
  const query = new URLSearchParams();
  const regionCode = search.get('regionCode');
  const foodId = search.get('foodId');
  if (regionCode && /^\d{5}$/.test(regionCode)) query.set('regionCode', regionCode);
  if (foodId && /^[1-9]\d*$/.test(foodId)) query.set('foodId', foodId);
  const suffix = query.toString();
  return suffix ? `/?${suffix}` : '/';
}

/** 빈 결과는 실제 조회에 성공한 경우에만 사용한다. */
export function reviewStatusText(status: 'unavailable' | 'empty') {
  return status === 'empty'
    ? { title: '아직 리뷰가 없어요', description: '리뷰가 등록되면 여기에서 볼 수 있어요.' }
    : { title: '식당 리뷰를 준비하고 있어요', description: '리뷰를 볼 수 있게 되면 이곳에서 알려드릴게요.' };
}

export function cleanRestaurantName(name: string | null): string | null {
  const value = name?.trim();
  return value && value.length <= 100 ? value : null;
}
