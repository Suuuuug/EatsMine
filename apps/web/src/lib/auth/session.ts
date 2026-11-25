"use client";

import { useEffect, useState } from "react";
import { getSupabase, isAuthConfigured } from "@/lib/auth/supabase";

export type SessionUser = { id: string; name: string; email: string; avatarUrl: string | null };
export type Session = { user: SessionUser; accessToken: string } | null;
/** loading: 브라우저에서 세션을 확인하는 중. 확인이 끝나기 전에는 로그인 화면을 먼저 보여 주지 않는다. */
export type SessionState = { status: "loading" } | { status: "ready"; session: Session };

export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>(() => (isAuthConfigured() ? { status: "loading" } : { status: "ready", session: null }));

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    const toSession = (s: { access_token: string; user: { id: string; email?: string; user_metadata?: Record<string, unknown> } } | null): Session => {
      if (!s) return null;
      const meta = s.user.user_metadata ?? {};
      const avatar = [meta.avatar_url, meta.picture].find((v): v is string => typeof v === "string" && v.startsWith("https://"));
      return {
        accessToken: s.access_token,
        user: { id: s.user.id, email: s.user.email ?? "", name: typeof meta.name === "string" ? meta.name : "", avatarUrl: avatar ?? null },
      };
    };
    supabase.auth.getSession().then(({ data }) => setState({ status: "ready", session: toSession(data.session) }));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setState({ status: "ready", session: toSession(s) }));
    return () => data.subscription.unsubscribe();
  }, []);

  return state;
}

export async function signOut() {
  await getSupabase()?.auth.signOut();
}
