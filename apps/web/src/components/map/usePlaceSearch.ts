"use client";

import { useEffect, useRef, useState } from "react";
import { MIN_PLACE_QUERY, normalizeQuery, searchPlacesWith, type KakaoMapsWithServices, type PlaceResult } from "@/lib/map/place-search";
import { loadKakaoMapsSdk } from "./KakaoMapLayer";

/** 입력을 멈춘 뒤 이 시간이 지나야 부른다(글자마다 부르지 않는다). */
const DEBOUNCE_MS = 250;

export type PlaceSearchResult =
  | { status: "idle"; places: [] }
  | { status: "loading"; places: [] }
  | { status: "ready"; places: PlaceResult[] }
  | { status: "error"; places: [] };

export type PlaceSearchState = PlaceSearchResult & {
  /** 장소 검색이 안 됐을 때 다시 해 본다(TDS 오류 화면의 "다시 시도하기") */
  retry: () => void;
};

const NOOP = () => {};
const IDLE: PlaceSearchState = { status: "idle", places: [], retry: NOOP };

/**
 * 입력한 말로 역·랜드마크를 찾는다(카카오맵 SDK 장소 검색).
 * - 한글 조합 중(composing)에는 부르지 않고, 입력을 멈춘 0.25초 뒤에 부른다. 2글자부터.
 * - 먼저 보낸 요청이 늦게 돌아와도 최신 검색어의 결과만 쓴다.
 * - 키가 없거나 SDK를 못 불러오면 error로 알려, 화면이 지역 검색만으로 계속 쓰게 한다.
 * 결과는 저장하지 않는다.
 */
export function usePlaceSearch(query: string, known: ReadonlySet<string>, composing: boolean): PlaceSearchState {
  // 돌아온 결과는 어느 검색어의 것인지와 함께 둔다. 지금 검색어와 같을 때만 쓰고, 다르면 불러오는 중으로 본다.
  const [result, setResult] = useState<{ query: string; attempt: number; state: PlaceSearchResult } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const knownRef = useRef(known);
  useEffect(() => {
    knownRef.current = known;
  }, [known]);

  const normalized = normalizeQuery(query);
  const active = !composing && normalized.length >= MIN_PLACE_QUERY;

  useEffect(() => {
    if (!active) return;
    let cancelled = false; // 먼저 보낸 요청이 늦게 돌아와도 최신 검색어의 결과만 쓴다
    const timer = window.setTimeout(async () => {
      try {
        const appKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
        if (!appKey) throw new Error("kakao key missing");
        const maps = (await loadKakaoMapsSdk(appKey)) as unknown as KakaoMapsWithServices;
        const places = await searchPlacesWith(maps, normalized, knownRef.current);
        if (!cancelled) setResult({ query: normalized, attempt, state: { status: "ready", places } });
      } catch {
        if (!cancelled) setResult({ query: normalized, attempt, state: { status: "error", places: [] } });
      }
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [active, normalized, attempt]);

  if (!active) return IDLE;
  const retry = () => setAttempt((n) => n + 1);
  return result && result.query === normalized && result.attempt === attempt
    ? { ...result.state, retry }
    : { status: "loading", places: [], retry };
}
