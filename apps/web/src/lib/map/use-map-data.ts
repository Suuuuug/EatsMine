"use client";

import { useEffect, useState } from "react";
import { errorMessage } from "@/lib/map/use-restaurants";
import {
  buildRegionSearchUrls,
  mergeSearchResults,
  territoriesUrl,
} from "@/lib/map/map-data";
import type {
  RestaurantSearchResult,
  TerritoryOwner,
  TerritoryOwnersResponse,
} from "@/types/map";

/*
 * 홈 지도용 실제 API 조회 훅. apiBase가 null이면(예시 모드) 아무것도 부르지 않는다.
 */

const FALLBACK = "식당 정보를 불러오지 못했어요. 다시 시도해 주세요.";

class ApiError extends Error {}

async function getJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal, cache: "no-store" });
  if (!response.ok) throw new ApiError(errorMessage(response.status));
  return (await response.json()) as T;
}

export type MapRestaurantsState = {
  result: RestaurantSearchResult | null;
  loading: boolean;
  error: string;
};

/** GET /restaurants — 지역 + 고른 업종(여러 개면 업종마다 조회 후 합침). attempt를 올리면 다시 조회한다. */
export function useMapRestaurants(
  apiBase: string | null,
  regionCode: string | null,
  genres: readonly string[],
  attempt = 0,
): MapRestaurantsState {
  const urls =
    apiBase && regionCode
      ? buildRegionSearchUrls(apiBase, regionCode, genres)
      : [];
  const key = urls.length ? `${urls.join(" ")}#${attempt}` : "";
  const [state, setState] = useState<{
    key: string;
    result: RestaurantSearchResult | null;
    error: string;
  } | null>(null);

  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    const targets = key.slice(0, key.lastIndexOf("#")).split(" ");
    Promise.all(
      targets.map((url) =>
        getJson<RestaurantSearchResult>(url, controller.signal),
      ),
    )
      .then((results) => {
        if (results.some((r) => !Array.isArray(r?.items)))
          throw new ApiError(FALLBACK);
        setState({ key, result: mergeSearchResults(results), error: "" });
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          key,
          result: null,
          error: e instanceof ApiError ? e.message : FALLBACK,
        });
      });
    return () => controller.abort();
  }, [key]);

  if (!key) return { result: null, loading: false, error: "" };
  if (state?.key !== key) return { result: null, loading: true, error: "" };
  return { result: state.result, loading: false, error: state.error };
}

/** GET /territories — 영토 주인 목록. 실패하면 빈 목록(지도는 색칠 없이 표시). */
export function useTerritoryOwners(apiBase: string | null): TerritoryOwner[] {
  const [owners, setOwners] = useState<TerritoryOwner[]>([]);

  useEffect(() => {
    if (!apiBase) return;
    const controller = new AbortController();
    getJson<TerritoryOwnersResponse>(territoriesUrl(apiBase), controller.signal)
      .then((data) => {
        if (Array.isArray(data?.items)) setOwners(data.items);
      })
      .catch(() => {
        // 영토 색칠은 부가 정보라 실패해도 식당 탐색을 막지 않는다.
      });
    return () => controller.abort();
  }, [apiBase]);

  return apiBase ? owners : [];
}
