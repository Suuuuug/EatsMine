"use client";

import { useEffect, useState } from "react";
import { buildRestaurantUrl, validEatplUrl } from "@/lib/map/home-contract";
import { normalizeApiBase } from "@/lib/dictionary/dictionary-api";

/*
 * 시군구 5자리 코드(+선택적 숫자 foodId)로 우리 API의 식당 목록을 조회한다.
 * - foodId가 있으면 GET /restaurants?regionCode=...&foodId=... (음식 키워드/업종 기반 검색)
 * - merUrl은 validEatplUrl로 검증만 하고 원본 그대로 둔다(쿼리 추가·변형 금지).
 */

export type PlaceReviewSummary = {
  average: number;
  count: number;
  featured: {
    id: number;
    nickname: string;
    rating: number;
    content: string;
  } | null;
};

export type Place = {
  id: string;
  name: string;
  address: string;
  genre: string | null;
  rankNational: number | null;
  estimatedHours: { start: string; end: string } | null;
  merUrl: string;
  reviewSummary?: PlaceReviewSummary | null;
};

export type RestaurantResult = {
  items: Place[];
  matchedBy?: "keyword" | "genre";
  food?: { id: number; name: string };
  source?: string;
};

export type RestaurantsState = {
  result: RestaurantResult | null;
  loading: boolean;
  error: string;
};

const apiBase = normalizeApiBase(process.env.NEXT_PUBLIC_API_URL);
const FALLBACK = "식당 정보를 불러오지 못했어요. 다시 시도해 주세요.";

export function errorMessage(status: number) {
  if (status === 401 || status === 403)
    return "식당 정보를 불러올 권한을 확인하고 있어요.";
  if (status === 404) return "이 지역의 식당 정보를 찾지 못했어요.";
  if (status === 429) return "요청이 많아요. 잠시 후 다시 시도해 주세요.";
  if (status === 502 || status === 503)
    return "식당 정보를 불러올 수 없어요. 잠시 후 다시 시도해 주세요.";
  return FALLBACK;
}

/**
 * regionCode가 null이거나 API 주소가 없으면 조회하지 않는다.
 * foodId가 양의 정수면 음식 기반 검색(GET /restaurants?regionCode=...&foodId=...)을 수행한다.
 * attempt를 올리면 다시 조회한다.
 */
export function useRestaurants(
  regionCode: string | null,
  foodId: number | null = null,
  attempt = 0,
): RestaurantsState {
  const foodIdStr =
    foodId !== null && Number.isInteger(foodId) && foodId > 0
      ? String(foodId)
      : null;
  const url =
    regionCode && apiBase
      ? buildRestaurantUrl(apiBase, regionCode, foodIdStr)
      : null;
  const [state, setState] = useState<{
    key: string;
    result: RestaurantResult | null;
    error: string;
  } | null>(null);
  const key = url ? `${url}#${attempt}` : "";

  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    fetch(url, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(errorMessage(response.status));
        const data = (await response.json()) as RestaurantResult;
        if (!Array.isArray(data.items)) throw new Error(FALLBACK);
        const items = data.items.filter((item) => validEatplUrl(item.merUrl));
        setState({ key, result: { ...data, items }, error: "" });
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        const message =
          e instanceof Error &&
          (e.message.startsWith("식당") ||
            e.message.startsWith("이 지역") ||
            e.message.startsWith("요청"))
            ? e.message
            : FALLBACK;
        setState({ key, result: null, error: message });
      });
    return () => controller.abort();
  }, [url, key]);

  if (!key) return { result: null, loading: false, error: "" };
  if (state?.key !== key) return { result: null, loading: true, error: "" };
  return { result: state.result, loading: false, error: state.error };
}
