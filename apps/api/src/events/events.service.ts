import { Injectable, Logger } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { outboundEvents } from '../db/schema.js';

export type OutboundEventInput = {
  restaurantKey: string;
  regionCode?: string;
  placement: 'list' | 'map' | 'share';
  sourceChannel?: string;
  sessionKey: string;
};

/** 보관 기간 (D11) */
export const OUTBOUND_RETENTION_DAYS = 90;
/** 기록할 때 오래된 행 정리를 시도할 확률 (서버리스라 cron 대신) */
const CLEANUP_PROBABILITY = 0.01;

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(@InjectDrizzle() private readonly db: NodePgDatabase) {}

  async recordOutbound(input: OutboundEventInput): Promise<void> {
    await this.db.insert(outboundEvents).values({
      restaurantKey: input.restaurantKey,
      regionCode: input.regionCode ?? null,
      placement: input.placement,
      sourceChannel: input.sourceChannel ?? null,
      sessionKey: input.sessionKey,
    });
    if (Math.random() < CLEANUP_PROBABILITY) void this.deleteExpired();
  }

  /** 보관 기간이 지난 기록 삭제 */
  async deleteExpired(): Promise<void> {
    try {
      await this.db.execute(
        sql`DELETE FROM outbound_events WHERE occurred_at < now() - make_interval(days => ${OUTBOUND_RETENTION_DAYS})`,
      );
    } catch (e) {
      this.logger.warn(`잇플 이동 기록 정리 실패: ${(e as Error).message}`);
    }
  }
}
