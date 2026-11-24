import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

/** rate limit 기록 (DbThrottlerStorage가 사용). 서버리스라 메모리 대신 DB에 저장한다. */
export const rateLimitHits = pgTable('rate_limit_hits', {
  key: text().primaryKey(),
  hits: integer().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  blockedUntil: timestamp('blocked_until', { withTimezone: true }),
});
