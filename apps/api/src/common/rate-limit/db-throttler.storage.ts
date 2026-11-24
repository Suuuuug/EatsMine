import { Injectable, Logger } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import type { ThrottlerStorage } from '@nestjs/throttler';
import { sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

type ThrottlerStorageRecord = Awaited<
  ReturnType<ThrottlerStorage['increment']>
>;

type Row = { hits: number; ttl_s: string | number; block_s: string | number };

/** 만료된 기록 정리를 몇 번에 한 번 할지 (확률) */
const CLEANUP_PROBABILITY = 0.01;

/**
 * rate limit 카운터를 Postgres에 저장하는 ThrottlerStorage.
 * 고정 윈도우 방식: 윈도우(ttl) 동안 횟수를 세고, limit을 넘으면 blockDuration 동안 차단한다.
 * 한 번의 upsert로 처리해서 동시 요청에도 횟수가 어긋나지 않는다.
 */
@Injectable()
export class DbThrottlerStorage implements ThrottlerStorage {
  private readonly logger = new Logger(DbThrottlerStorage.name);

  constructor(@InjectDrizzle() private readonly db: NodePgDatabase) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
  ): Promise<ThrottlerStorageRecord> {
    // 윈도우를 새로 시작하는 조건: 차단이 끝났거나, 차단 없이 윈도우가 만료됨
    const reset = sql`((t.blocked_until IS NOT NULL AND t.blocked_until <= now()) OR (t.blocked_until IS NULL AND t.expires_at <= now()))`;
    const ttlInterval = sql`(${ttl}::float8 * interval '1 millisecond')`;
    const blockInterval = sql`(${blockDuration}::float8 * interval '1 millisecond')`;

    const result = await this.db.execute<Row>(sql`
      INSERT INTO rate_limit_hits AS t (key, hits, expires_at)
      VALUES (${key}, 1, now() + ${ttlInterval})
      ON CONFLICT (key) DO UPDATE SET
        hits = CASE WHEN ${reset} THEN 1 ELSE t.hits + 1 END,
        expires_at = CASE WHEN ${reset} THEN now() + ${ttlInterval} ELSE t.expires_at END,
        blocked_until = CASE
          WHEN t.blocked_until > now() THEN t.blocked_until
          WHEN (CASE WHEN ${reset} THEN 1 ELSE t.hits + 1 END) > ${limit}::int THEN now() + ${blockInterval}
          ELSE NULL
        END
      RETURNING
        t.hits,
        greatest(ceil(extract(epoch FROM (t.expires_at - now()))), 0) AS ttl_s,
        coalesce(greatest(ceil(extract(epoch FROM (t.blocked_until - now()))), 0), 0) AS block_s
    `);

    if (Math.random() < CLEANUP_PROBABILITY) void this.cleanup();

    const row = result.rows[0];
    const timeToBlockExpire = Number(row.block_s);
    return {
      totalHits: Number(row.hits),
      timeToExpire: Number(row.ttl_s),
      isBlocked: timeToBlockExpire > 0,
      timeToBlockExpire,
    };
  }

  /** 하루 이상 지난 만료 기록 삭제 */
  private async cleanup() {
    try {
      await this.db.execute(sql`
        DELETE FROM rate_limit_hits
        WHERE expires_at < now() - interval '1 day'
          AND (blocked_until IS NULL OR blocked_until < now())
      `);
    } catch (e) {
      this.logger.warn(`rate limit 기록 정리 실패: ${(e as Error).message}`);
    }
  }
}
