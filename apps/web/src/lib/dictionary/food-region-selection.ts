/*
 * 도감에서 음식을 고르면 그 음식이 나는 지역을 영토 지도에 칠하는 순수 로직.
 * 음식 식별은 도감 그림 슬러그(food-illustrations.ts의 값)로 한다. API 숫자 foodId 계약이 없어 식당은 regionCode로만 조회한다.
 */

export type FoodRegion = { code: string; name: string; reason?: string };
export type FoodEntry = { slug: string; name: string; regions: FoodRegion[] };
export type FoodSelection = { food: string | null; regionCode: string | null };
export type Territory = { code: string; parentCode?: string | null };

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const REGION_CODE = /^\d{5}$/;

/** URL의 food(슬러그)·regionCode(5자리)를 읽는다. 형식이 틀리거나 알려진 목록에 없으면 null이다. */
export function parseFoodSelection(params: URLSearchParams, knownSlugs?: ReadonlySet<string>): FoodSelection {
  const rawFood = params.get('food');
  const food = rawFood && SLUG.test(rawFood) && (!knownSlugs || knownSlugs.has(rawFood)) ? rawFood : null;
  const rawRegion = params.get('regionCode');
  return { food, regionCode: rawRegion && REGION_CODE.test(rawRegion) ? rawRegion : null };
}

/** 선택을 URL로 만든다. 다른 파라미터(예: collection)는 그대로 두고, 잘못된 값과 null은 지운다. 입력은 바꾸지 않는다. */
export function foodSelectionParams(base: URLSearchParams, selection: FoodSelection): URLSearchParams {
  const next = new URLSearchParams(base);
  next.delete('food');
  next.delete('regionCode');
  if (selection.food && SLUG.test(selection.food)) next.set('food', selection.food);
  if (selection.regionCode && REGION_CODE.test(selection.regionCode)) next.set('regionCode', selection.regionCode);
  return next;
}

/** 도감 음식 목록과 이름→슬러그 매핑을 합쳐 슬러그로 찾을 수 있게 한다. 슬러그가 없는 음식은 뺀다. */
export function buildFoodIndex(
  foods: readonly { name: string; regions?: readonly FoodRegion[] }[],
  illustrations: Readonly<Record<string, string>>,
): FoodEntry[] {
  const index: FoodEntry[] = [];
  for (const food of foods) {
    const slug = illustrations[food.name];
    if (slug) index.push({ slug, name: food.name, regions: (food.regions ?? []).map(r => ({ ...r })) });
  }
  return index;
}

/** 음식 슬러그의 추천 지역. 모르는 슬러그나 추천 지역이 없는 음식은 빈 배열이다. */
export function findFoodRegions(index: readonly FoodEntry[], slug: string | null): FoodRegion[] {
  if (!slug) return [];
  return index.find(f => f.slug === slug)?.regions ?? [];
}

/** 5자리 코드를 시도(2자리) 부모로 모은다. region-codes.json에 없는 코드는 버리고, 시도는 처음 나온 순서를 유지한다. */
export function groupByProvince(
  codes: readonly string[],
  territories: readonly Territory[],
): { provinceCode: string; codes: string[] }[] {
  const parentOf = new Map(territories.map(t => [t.code, t.parentCode ?? '']));
  const groups = new Map<string, string[]>();
  for (const code of codes) {
    const parent = parentOf.get(code);
    if (!parent) continue;
    const list = groups.get(parent) ?? [];
    if (!list.includes(code)) list.push(code);
    groups.set(parent, list);
  }
  return [...groups].map(([provinceCode, list]) => ({ provinceCode, codes: list }));
}
