// 로그인 상태. Supabase Auth(Google)를 붙이기 전까지는 항상 비로그인이다.
// 붙일 때: 서버에서 Supabase 세션을 읽어 이 모양으로 돌려준다(백엔드 작업 때).

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
};

export type Session = { user: SessionUser } | null;

export function getSession(): Session {
  return null;
}
