// Google 로그인 시작. Supabase Auth의 Google 공급자를 쓴다고 가정한 자리다.
// 지금은 Supabase 클라이언트와 키가 없어서(백엔드 작업 전) "준비 중"을 돌려준다.
// 연결할 때 이 함수 안만 바꾼다:
//   const supabase = createBrowserClient(url, anonKey)
//   const { error } = await supabase.auth.signInWithOAuth({
//     provider: "google",
//     options: { redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
//   })
// 받는 정보는 Supabase 기본 범위(openid, email, profile): 이름, 이메일, 프로필 사진.

export type SignInResult = { ok: true } | { ok: false; reason: "not-configured" | "failed" };

/** Supabase 클라이언트가 실제로 연결됐는지. 지금은 클라이언트를 들이기 전이라 항상 false. */
export function isGoogleSignInConfigured(): boolean {
  return false;
}

export async function signInWithGoogle(next: string): Promise<SignInResult> {
  void next;
  if (!isGoogleSignInConfigured()) return { ok: false, reason: "not-configured" };
  // 연결 작업 때 여기서 signInWithOAuth를 부른다(위 주석).
  return { ok: false, reason: "failed" };
}
