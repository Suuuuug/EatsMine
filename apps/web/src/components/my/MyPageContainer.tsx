"use client";

import { useCallback, useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { MyPageView } from "@/components/my/MyPageView";
import { ActionButton } from "@/components/em";
import { SignOutButton } from "@/components/my/SignOutButton";
import { useSession } from "@/lib/auth/session";
import { ApiError, fetchMyPage } from "@/lib/my-page/api";
import { SAMPLE_MY_PAGE } from "@/lib/my-page/sample-data";
import type { MyPageData } from "@/types/my-page";

type Load = { key: string; data: MyPageData | null; error: string };

function errorText(error: unknown) {
  if (error instanceof ApiError && error.status === 401) return "로그인이 만료됐어요. 다시 로그인해 주세요.";
  if (error instanceof ApiError && error.status === 429) return "요청이 많아요. 잠시 후 다시 시도해 주세요.";
  return "기록을 불러오지 못했어요. 다시 시도해 주세요.";
}

/** 세션을 확인하고, 로그인했으면 우리 API에서 내 기록을 가져와 마이페이지를 그린다. */
export function MyPageContainer() {
  const state = useSession();
  const [attempt, setAttempt] = useState(0);
  const [load, setLoad] = useState<Load | null>(null);
  const token = state.status === "ready" ? (state.session?.accessToken ?? null) : null;
  const key = token ? `${state.status === "ready" ? state.session?.user.id : ""}#${attempt}` : "";

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetchMyPage(token)
      .then((data) => !cancelled && setLoad({ key, data, error: "" }))
      .catch((e: unknown) => !cancelled && setLoad({ key, data: null, error: errorText(e) }));
    return () => {
      cancelled = true;
    };
  }, [token, key]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  if (state.status === "loading" || (token && load?.key !== key)) {
    return <Shell><p role="status" className="type-body">불러오는 중이에요</p></Shell>;
  }
  if (!token) return <MyPageView data={SAMPLE_MY_PAGE} member={false} token={null} />;
  if (load?.data) return <MyPageView data={load.data} member token={token} />;
  return (
    <Shell>
      <p role="alert" className="type-body">{load?.error}</p>
      <div className="flex w-full max-w-xs flex-col gap-2">
        <ActionButton variant="fill" size="md" block onClick={retry}>다시 불러오기</ActionButton>
        <SignOutButton />
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="em-theme my-backdrop min-h-dvh pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0 md:pl-[76px]">
      <Sidebar />
      <main className="mx-auto flex min-h-[60dvh] w-full max-w-2xl flex-col items-center justify-center gap-4 px-4 text-center text-foreground">
        <h1 className="sr-only">마이페이지</h1>
        {children}
      </main>
    </div>
  );
}
