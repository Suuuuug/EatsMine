"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { isAuthConfigured } from "@/lib/auth/supabase";
import { safeNext } from "@/lib/auth/next";
import { getSupabase } from "@/lib/auth/supabase";

// Google 로그인 뒤 돌아오는 곳. supabase-js가 주소의 code를 세션으로 바꾸면 원래 화면으로 보낸다.
function Callback() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [timedOut, setTimedOut] = useState(false);
  const failed = timedOut || !isAuthConfigured();

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    let done = false;
    const go = () => {
      if (!done) {
        done = true;
        router.replace(next);
      }
    };
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) go();
    });
    const timer = window.setTimeout(() => !done && setTimedOut(true), 8000);
    return () => {
      data.subscription.unsubscribe();
      window.clearTimeout(timer);
    };
  }, [next, router]);

  return (
    <main className="em-theme flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center text-foreground">
      <p role="status" className="type-body">{failed ? "로그인하지 못했어요. 다시 시도해 주세요." : "로그인하는 중이에요"}</p>
      {failed && <a href="/login" className="pressable inline-flex min-h-11 items-center type-row font-medium text-accent">로그인으로 돌아가기</a>}
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <Callback />
    </Suspense>
  );
}
