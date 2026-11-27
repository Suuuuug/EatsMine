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

/** 식당 목록을 한 번에 그리는 개수. '더 보기'를 누를 때마다 이만큼 늘린다. 지도 핀은 이 개수와 상관없이 모두 찍는다. */
export const PLACE_PAGE_SIZE = 20;

/** 지금 보여줄 개수(최소 한 페이지, 전체를 넘지 않음)와 남은 개수 */
export function pagePlaces<T>(items: readonly T[], shown: number): { visible: T[]; remaining: number } {
  const count = Math.min(items.length, Math.max(PLACE_PAGE_SIZE, shown));
  return { visible: items.slice(0, count), remaining: items.length - count };
}

/** index번째(0부터) 가게가 목록에 보이도록 펼칠 개수. 이미 보이면 그대로, 아니면 그 가게가 든 페이지 끝까지 */
export function shownCountToInclude(index: number, shown: number): number {
  if (index < 0) return shown;
  const needed = Math.ceil((index + 1) / PLACE_PAGE_SIZE) * PLACE_PAGE_SIZE;
  return Math.max(shown, PLACE_PAGE_SIZE, needed);
}

/** 카드 사진: 매장 사진(있으면) → 공개 리뷰 대표 사진 → 없으면 null(업종 그림을 쓴다). https 주소만 */
export function cardPhotoUrl(place: { imageUrl?: string | null; reviewSummary?: PlaceReviewSummaryDto | null }): string | null {
  for (const url of [place.imageUrl, place.reviewSummary?.photoUrl]) {
    if (typeof url === 'string' && url.startsWith('https://')) return url;
  }
  return null;
}
