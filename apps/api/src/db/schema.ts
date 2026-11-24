import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  bigint,
  check,
  doublePrecision,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { RANK_KEYS } from '../profiles/ranks.js';

// 모든 테이블은 RLS를 켜고 정책은 두지 않는다 (D2).
// → 브라우저에서 Supabase anon key로 Data API 직접 접근 차단. api는 관리자 권한 연결이라 영향 없음.

/** rate limit 기록 (DbThrottlerStorage가 사용). 서버리스라 메모리 대신 DB에 저장한다. */
export const rateLimitHits = pgTable.withRLS('rate_limit_hits', {
  key: text().primaryKey(),
  hits: integer().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  blockedUntil: timestamp('blocked_until', { withTimezone: true }),
});

/** 시·도 / 시·군·구 (영토 단위, D5). 데이터: data/regions.json → npm run db:seed */
export const regions = pgTable.withRLS(
  'regions',
  {
    /** 법정동코드 앞자리: 시·군·구 5자리, 시·도 2자리 */
    code: varchar({ length: 5 }).primaryKey(),
    parentCode: varchar('parent_code', { length: 5 }).references(
      (): AnyPgColumn => regions.code,
    ),
    level: text({ enum: ['sido', 'sigungu'] }).notNull(),
    name: text().notNull(),
    fullName: text('full_name').notNull(),
    /** 잇플 검색어 (시·군·구만) */
    eatplQuery: text('eatpl_query'),
    /** 결과 주소 정규화용 시·도 이름 목록 (시·도만) */
    addressAliases: text('address_aliases').array(),
    centerLat: doublePrecision('center_lat'),
    centerLng: doublePrecision('center_lng'),
  },
  (t) => [check('regions_level_check', sql`${t.level} IN ('sido', 'sigungu')`)],
);

export type Region = typeof regions.$inferSelect;

/**
 * 잇플 이동 클릭 기록 (D11). 공모전 실적과 비교하기 위한 우리 쪽 기록. 90일 보관.
 * 개인정보 최소화: 사용자 ID 없이 브라우저 세션별 익명 값만 저장.
 */
export const outboundEvents = pgTable.withRLS(
  'outbound_events',
  {
    id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    /** merUrl 끝 고유값 (검색 결과는 저장하지 않으므로 FK 없음) */
    restaurantKey: text('restaurant_key').notNull(),
    /** 분석용이라 FK 없음 (저장 실패 방지), 형식만 api에서 검증 */
    regionCode: varchar('region_code', { length: 5 }),
    placement: text({ enum: ['list', 'map', 'share'] }).notNull(),
    sourceChannel: text('source_channel'),
    sessionKey: text('session_key').notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check(
      'outbound_events_placement_check',
      sql`${t.placement} IN ('list', 'map', 'share')`,
    ),
    index('outbound_events_occurred_at_source_channel_idx').on(
      t.occurredAt,
      t.sourceChannel,
    ),
  ],
);

/**
 * 회원 프로필 (D6). id = Supabase auth.users.id.
 * auth.users FK(ON DELETE CASCADE)는 drizzle이 auth 스키마를 건드리지 않도록 _manual_ 마이그레이션으로 추가한다.
 */
export const profiles = pgTable.withRLS(
  'profiles',
  {
    id: uuid().primaryKey(),
    /** 가입 시 자동 생성(미식탐험가0000), 중복 허용 */
    nickname: text().notNull(),
    /** 리뷰 수 기준 등급. 리뷰 작성·삭제 시 api가 재계산 */
    rank: text({ enum: RANK_KEYS }).notNull().default('rookie'),
    avatarUrl: text('avatar_url'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check(
      'profiles_rank_check',
      sql`${t.rank} IN ('rookie', 'local', 'conqueror', 'master')`,
    ),
  ],
);

export type Profile = typeof profiles.$inferSelect;
