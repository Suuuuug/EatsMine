import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// 브라우저용 Supabase 클라이언트. 공개 가능한 URL과 publishable 키만 쓴다.
// 세션은 이 브라우저(localStorage)에 두고, 우리 API를 부를 때 access token을 Bearer로 보낸다.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

export function isAuthConfigured(): boolean {
  return Boolean(url && key);
}

/** 브라우저에서만 부른다. 환경변수가 없으면 null. */
export function getSupabase(): SupabaseClient | null {
  if (typeof window === "undefined" || !url || !key) return null;
  client ??= createClient(url, key, { auth: { flowType: "pkce", detectSessionInUrl: true } });
  return client;
}
