"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ActionButton, EmptyState } from "@/components/em";
import { TerritoryExplorer } from "@/components/my/TerritoryExplorer";
import { useSession } from "@/lib/auth/session";
import { fetchRegionRanking } from "@/lib/dictionary/dictionary-api";
import { ApiError, apiFetch } from "@/lib/my-page/api";
import { SAMPLE_MY_PAGE } from "@/lib/my-page/sample-data";
import { sampleRanking } from "@/lib/territory/my-standing";

type Visited = { code: string; label: string };
type MyTerritory = { visited: Visited[]; reviewCount: number };
type Load = { key: string; data: MyTerritory | null; error: string };

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "";

const SAMPLE: MyTerritory = {
  visited: SAMPLE_MY_PAGE.regionVisits.map((v) => ({ code: String(v.region_id), label: v.region_name })),
  reviewCount: SAMPLE_MY_PAGE.reviews.length,
};
const loadSampleRanking = (code: string) => Promise.resolve(sampleRanking(code));

async function fetchMyTerritory(token: string): Promise<MyTerritory> {
  const [territories, me] = await Promise.all([
    apiFetch<{ items: { regionCode: string; regionName: string }[] }>("/me/territories", token),
    apiFetch<{ reviewCount: number }>("/me", token),
  ]);
  return {
    visited: territories.items.map((t) => ({ code: t.regionCode, label: t.regionName })),
    reviewCount: me.reviewCount,
  };
}

/** 로그인했으면 내 영토와 지역 순위를 우리 API에서, 아니면 예시를 그린다. */
export function MyTerritoryContainer() {
  const state = useSession();
  const [attempt, setAttempt] = useState(0);
  const [load, setLoad] = useState<Load | null>(null);
  const token = state.status === "ready" ? (state.session?.accessToken ?? null) : null;
  const key = token ? `${state.status === "ready" ? state.session?.user.id : ""}#${attempt}` : "";

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetchMyTerritory(token).then(
      (data) => !cancelled && setLoad({ key, data, error: "" }),
      (e: unknown) =>
        !cancelled &&
        setLoad({
          key,
          data: null,
          error: e instanceof ApiError && e.status === 401 ? "로그인이 만료됐어요. 다시 로그인해 주세요." : "영토를 불러오지 못했어요. 다시 불러와 주세요.",
        }),
    );
    return () => {
      cancelled = true;
    };
  }, [token, key]);

  // 토큰이 갱신돼도 콜백이 바뀌지 않게 ref로 읽는다(바뀌면 순위를 전부 다시 부르게 된다).
  const tokenRef = useRef(token);
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);
  const loadRanking = useCallback((code: string) => fetchRegionRanking(apiBase, code, tokenRef.current), []);

  if (state.status === "loading" || (token && load?.key !== key)) {
    return <p role="status" className="type-body">불러오는 중이에요</p>;
  }
  if (!token) {
    return (
      <>
        <p className="type-body text-muted">예시로 채운 화면이에요.</p>
        <TerritoryExplorer visited={SAMPLE.visited} reviewCount={SAMPLE.reviewCount} loadRanking={loadSampleRanking} />
      </>
    );
  }
  if (load?.data) {
    return <TerritoryExplorer visited={load.data.visited} reviewCount={load.data.reviewCount} loadRanking={loadRanking} />;
  }
  return (
    <div role="alert">
      <EmptyState
        illustration="load-error"
        message={load?.error ?? "영토를 불러오지 못했어요. 다시 불러와 주세요."}
        action={<ActionButton variant="tinted" onClick={() => setAttempt((n) => n + 1)}>다시 불러오기</ActionButton>}
      />
    </div>
  );
}
