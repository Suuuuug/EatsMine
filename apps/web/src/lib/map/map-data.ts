import { validEatplUrl } from './home-contract.ts';
import type { PlaceReviewSummaryDto, RestaurantSearchResult } from '../../types/map.ts';

/*
 * 홈 지도에서 쓰는 GET /restaurants, GET /territories 조회 규칙(순수 함수).
 */

/** api가 한 번에 받는 업종 수(GET /restaurants의 genre 최대 개수)와 같다. */
export const MAX_GENRES = 5;

/** API 주소가 없거나 /?preview=1 이면 예시 데이터를 쓴다. */
export function isPreviewMode(apiBase: string | undefined, search: string): boolean {
  return !apiBase || new URLSearchParams(search).get('preview') === '1';
}

/** 지역 + 업종(0~MAX_GENRES개)으로 조회할 GET /restaurants 주소. 업종은 genre=A&genre=B로 보내고 api가 합친다. */
export function buildRegionSearchUrl(base: string, regionCode: string, genres: readonly string[]): string | null {
  if (!/^\d{5}$/.test(regionCode)) return null;
  const query = new URLSearchParams({ regionCode });
  for (const genre of [...new Set(genres)].slice(0, MAX_GENRES)) query.append('genre', genre);
  return `${base.replace(/\/$/, '')}/restaurants?${query}`;
}

export function territoriesUrl(base: string): string {
  return `${base.replace(/\/$/, '')}/territories`;
}

/** 잇플 링크가 유효한 매장만 남긴다(merUrl은 원본 그대로). */
export function keepValidPlaces(result: RestaurantSearchResult): RestaurantSearchResult {
  return { ...result, items: result.items.filter((item) => validEatplUrl(item.merUrl)) };
}

/** 식당 카드 한 줄 요약. 공개 리뷰가 없거나 값이 이상하면 null(0점으로 보이지 않게). */
export type CardReview = { average: number; count: number; excerpt: string | null };

export function toCardReview(summary: PlaceReviewSummaryDto | null | undefined): CardReview | null {
  if (!summary || !Number.isFinite(summary.average) || summary.average < 1 || summary.average > 5) return null;
  if (!Number.isInteger(summary.count) || summary.count < 1) return null;
  return { average: summary.average, count: summary.count, excerpt: summary.featured?.content?.trim() || null };
}
