-- drizzle-kit migrate 시절의 이력 테이블 정리.
-- 마이그레이션 이력은 이제 supabase_migrations.schema_migrations가 관리한다 (supabase/README.md).
-- drizzle-kit generate는 apps/api/drizzle/의 스냅숏을 쓰므로 이 테이블과 무관하다.
DROP TABLE IF EXISTS drizzle.__drizzle_migrations;

-- RESTRICT(기본값): 스키마에 다른 객체가 남아 있으면 지우지 않고 실패한다.
DROP SCHEMA IF EXISTS drizzle;
