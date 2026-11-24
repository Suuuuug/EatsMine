/** 검증된 Supabase 토큰에서 꺼낸 로그인 사용자 */
export type AuthUser = {
  /** Supabase auth.users.id (= profiles.id) */
  id: string;
  email: string | null;
  /** 구글 프로필 사진 (user_metadata.avatar_url 또는 picture) */
  avatarUrl: string | null;
};
