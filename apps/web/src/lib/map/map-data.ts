import { validEatplUrl } from './home-contract.ts';
import type { EatplPlace, RestaurantSearchResult } from '../../types/map.ts';

/*
 * 홈 지도에서 쓰는 GET /restaurants, GET /territories 조회 규칙(순수 함수).
 * api는 업종(genre)을 1개만 받으므로, 여러 업종을 고르면 업종마다 따로 조회해 합친다.
 */

/** API 주소가 없거나 /?preview=1 이면 예시 데이터를 쓴다. */
export function isPreviewMode(apiBase: string | undefined, search: string): boolean {
  return !apiBase || new URLSearchParams(search).get('preview') === '1';
}

/** 지역 + 업종(0개 이상)으로 조회할 GET /restaurants 주소 목록. 업종이 없으면 지역 전체 1건. */
export function buildRegionSearchUrls(base: string, regionCode: string, genres: readonly string[]): string[] {
  if (!/^\d{5}$/.test(regionCode)) return [];
  const root = `${base.replace(/\/$/, '')}/restaurants`;
  const unique = [...new Set(genres)];
  if (!unique.length) return [`${root}?${new URLSearchParams({ regionCode })}`];
  return unique.map((genre) => `${root}?${new URLSearchParams({ regionCode, genre })}`);
}

export function territoriesUrl(base: string): string {
  return `${base.replace(/\/$/, '')}/territories`;
}

const byLocalRank = (a: EatplPlace, b: EatplPlace) =>
  (a.rankLocal ?? Number.POSITIVE_INFINITY) - (b.rankLocal ?? Number.POSITIVE_INFINITY);

/** 업종별 응답을 하나로 합친다: 잇플 링크가 유효한 매장만, 중복 제거, 여러 업종이면 지역 매출 순위순. */
export function mergeSearchResults(results: readonly RestaurantSearchResult[]): RestaurantSearchResult | null {
  if (!results.length) return null;
  const seen = new Set<string>();
  const items: EatplPlace[] = [];
  for (const result of results) {
    for (const item of result.items) {
      if (seen.has(item.id) || !validEatplUrl(item.merUrl)) continue;
      seen.add(item.id);
      items.push(item);
    }
  }
  if (results.length > 1) items.sort(byLocalRank);
  return { ...results[0], items };
}
