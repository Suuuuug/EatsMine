// 로그인 상태. Supabase Auth(Google)를 붙이기 전까지는 항상 비로그인이다.
// 붙일 때: 서버·클라이언트에서 Supabase 세션을 읽어 accessToken과 함께 돌려준다.

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
};

export type Session = {
  user: SessionUser;
  accessToken?: string | null;
} | null;

export function getSession(): Session {
  return null;
}

/** 인증 API(GET /me, /me/collection, /me/reviews 등)에 사용할 Bearer 토큰을 반환한다. */
export function getAccessToken(): string | null {
  const token = getSession()?.accessToken?.trim();
  return token ? token : null;
}
