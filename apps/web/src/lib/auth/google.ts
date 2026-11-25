import { safeNext } from "@/lib/auth/next";
import { getSupabase, isAuthConfigured } from "@/lib/auth/supabase";

// Google 로그인 시작(Supabase Auth). 받는 정보는 기본 범위(openid, email, profile)뿐이다.
export type SignInResult = { ok: true } | { ok: false; reason: "not-configured" | "failed" };

export function isGoogleSignInConfigured(): boolean {
  return isAuthConfigured();
}

export async function signInWithGoogle(next: string): Promise<SignInResult> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, reason: "not-configured" };
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext(next))}` },
  });
  return error ? { ok: false, reason: "failed" } : { ok: true };
}
