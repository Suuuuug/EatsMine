import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  bigint,
  check,
  date,
  doublePrecision,
  index,
  unique,
  integer,
  pgTable,
  primaryKey,
  smallint,
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

/**
 * 제철 음식 도감 (D7). 데이터: data/foods.json (팀 직접 큐레이션) → npm run db:seed:foods
 * 잇플에는 메뉴 정보가 없어 search_keyword(가맹점명)와 업종으로 매장을 찾는다.
 */
export const foods = pgTable.withRLS('foods', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text().notNull().unique(),
  description: text().notNull(),
  imageUrl: text('image_url'),
  /** 제철 근거 링크 (선택) */
  sourceUrl: text('source_url'),
  /** 잇플 가맹점명 검색어 (예: 방어회 → "방어") */
  searchKeyword: text('search_keyword'),
});

export const foodSeasons = pgTable.withRLS(
  'food_seasons',
  {
    foodId: integer('food_id')
      .notNull()
      .references(() => foods.id, { onDelete: 'cascade' }),
    month: smallint().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.foodId, t.month] }),
    check('food_seasons_month_check', sql`${t.month} BETWEEN 1 AND 12`),
  ],
);

export const foodRegions = pgTable.withRLS(
  'food_regions',
  {
    foodId: integer('food_id')
      .notNull()
      .references(() => foods.id, { onDelete: 'cascade' }),
    regionCode: varchar('region_code', { length: 5 })
      .notNull()
      .references(() => regions.code),
    /** foods.json 순서. 0번이 "이 음식 먹으러 가기"의 기본 지역 */
    position: smallint().notNull().default(0),
    reason: text().notNull(),
  },
  (t) => [primaryKey({ columns: [t.foodId, t.regionCode] })],
);

/** 음식 ↔ 잇플 업종 (43종만, seed·테스트에서 검증) */
export const foodGenres = pgTable.withRLS(
  'food_genres',
  {
    foodId: integer('food_id')
      .notNull()
      .references(() => foods.id, { onDelete: 'cascade' }),
    genre: text().notNull(),
  },
  (t) => [primaryKey({ columns: [t.foodId, t.genre] })],
);

/**
 * 잇플 매장 (D4·D8). 리뷰를 남길 때만 그 매장 1건을 저장/갱신한다 (검색 결과는 저장하지 않음).
 * id = merUrl 끝 고유값. 리뷰 작성 시 잇플에 다시 조회해 검증한 값만 저장한다 (D10).
 */
export const restaurants = pgTable.withRLS('restaurants', {
  id: text().primaryKey(),
  /** 잇플 상세 링크 — 원본 그대로 */
  merUrl: text('mer_url').notNull(),
  name: text().notNull(),
  address: text().notNull(),
  genre: text(),
  /** 주소로 찾은 영토 지역. 매칭 실패 시 NULL */
  regionCode: varchar('region_code', { length: 5 }).references(
    () => regions.code,
  ),
  lat: doublePrecision(),
  lng: doublePrecision(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** 리뷰 (D8). 한 매장에 1인 1리뷰, 재방문은 수정 */
export const reviews = pgTable.withRLS(
  'reviews',
  {
    id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    restaurantId: text('restaurant_id')
      .notNull()
      .references(() => restaurants.id),
    /** 먹은 음식 (선택) → 도감 수집 */
    foodId: integer('food_id').references(() => foods.id, {
      onDelete: 'set null',
    }),
    rating: smallint().notNull(),
    content: text(),
    visitedAt: date('visited_at'),
    visibility: text({ enum: ['private', 'public'] })
      .notNull()
      .default('private'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique('reviews_user_restaurant_unique').on(t.userId, t.restaurantId),
    check('reviews_rating_check', sql`${t.rating} BETWEEN 1 AND 5`),
    check(
      'reviews_content_length_check',
      sql`${t.content} IS NULL OR char_length(${t.content}) <= 500`,
    ),
    check(
      'reviews_visibility_check',
      sql`${t.visibility} IN ('private', 'public')`,
    ),
    index('reviews_user_id_created_at_idx').on(t.userId, t.createdAt),
    /** 인기 지역(최근 30일) 집계용 */
    index('reviews_created_at_idx').on(t.createdAt),
  ],
);

/** 내 영토 (D8). 리뷰로만 획득, 뒷받침하는 리뷰가 없어지면 회수 */
export const userRegionVisits = pgTable.withRLS(
  'user_region_visits',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    regionCode: varchar('region_code', { length: 5 })
      .notNull()
      .references(() => regions.code),
    firstVisitedAt: timestamp('first_visited_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    sourceReviewId: bigint('source_review_id', { mode: 'number' }).references(
      () => reviews.id,
      { onDelete: 'set null' },
    ),
  },
  (t) => [primaryKey({ columns: [t.userId, t.regionCode] })],
);

/** 내 도감 (D8). 리뷰에서 음식을 고르면 수집, 뒷받침하는 리뷰가 없어지면 회수 */
export const userFoodCollection = pgTable.withRLS(
  'user_food_collection',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    foodId: integer('food_id')
      .notNull()
      .references(() => foods.id, { onDelete: 'cascade' }),
    collectedAt: timestamp('collected_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    sourceReviewId: bigint('source_review_id', { mode: 'number' }).references(
      () => reviews.id,
      { onDelete: 'set null' },
    ),
  },
  (t) => [primaryKey({ columns: [t.userId, t.foodId] })],
);

/**
 * 내 영토·도감 공유 링크 (D9). 사용자당 종류별 1개 — 다시 공유하면 같은 링크, 공유 취소 시 행 삭제.
 * id는 추측할 수 없는 무작위 10자 (순번 ID 금지).
 */
export const shareLinks = pgTable.withRLS(
  'share_links',
  {
    id: varchar({ length: 10 }).primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    shareType: text('share_type', {
      enum: ['territory', 'collection'],
    }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique('share_links_user_type_unique').on(t.userId, t.shareType),
    check(
      'share_links_type_check',
      sql`${t.shareType} IN ('territory', 'collection')`,
    ),
  ],
);
