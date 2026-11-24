import { applyDecorators, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AppThrottlerGuard } from './app-throttler.guard.js';

/**
 * 이 데코레이터를 붙인 라우트에만 rate limit을 건다.
 * 예: @RateLimit(10, 60_000) → IP당 1분에 10번
 */
export const RateLimit = (limit: number, ttlMs: number) =>
  applyDecorators(UseGuards(AppThrottlerGuard), Throttle({ default: { limit, ttl: ttlMs } }));
