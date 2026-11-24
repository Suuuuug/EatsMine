-- profiles.id → auth.users.id (D6: 탈퇴 시 프로필 연쇄 삭제)
-- drizzle이 auth 스키마를 관리하지 않도록 schema.ts가 아니라 여기서 건다.
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_id_auth_users_fkey
  FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE;
