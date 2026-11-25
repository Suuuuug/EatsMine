import { getSupabase } from "@/lib/auth/supabase";

// ⚠️ 개발용 임시 테스트 로그인. `next dev`에서만 동작하고 배포 빌드에서는 코드가 빠진다
// (NODE_ENV 조건이 빌드 때 상수로 접혀서 아래 NEXT_PUBLIC_ 값도 번들에 들어가지 않는다).
// 계정은 Supabase 대시보드 Authentication → Users에서 이메일·비밀번호로 만든 테스트 계정을 쓰고,
// 값은 apps/web/.env.local(커밋되지 않음)에만 둔다. Vercel 환경변수에는 넣지 않는다.

export function devLoginCredentials(): { email: string; password: string } | null {
  if (process.env.NODE_ENV !== "development") return null;
  const email = process.env.NEXT_PUBLIC_DEV_LOGIN_EMAIL?.trim();
  const password = process.env.NEXT_PUBLIC_DEV_LOGIN_PASSWORD;
  return email && password ? { email, password } : null;
}

export type DevLoginResult = { ok: true } | { ok: false; message: string };

export async function signInAsTestUser(): Promise<DevLoginResult> {
  const credentials = devLoginCredentials();
  const supabase = getSupabase();
  if (!credentials || !supabase) return { ok: false, message: "테스트 계정 설정이 없어요" };
  const { error } = await supabase.auth.signInWithPassword(credentials);
  return error ? { ok: false, message: `테스트 로그인 실패: ${error.message}` } : { ok: true };
}
