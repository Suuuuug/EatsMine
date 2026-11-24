import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { RATE_LIMIT_KEY, RateLimitGuard, type RateLimitOptions } from './rate-limit.guard.js';

/**
 * 이 데코레이터를 붙인 라우트에만 rate limit을 건다.
 * 예: @RateLimit(10, 60_000) → IP당 1분에 10번, 넘으면 1분 차단(429)
 */
export const RateLimit = (limit: number, ttlMs: number) =>
  applyDecorators(
    SetMetadata(RATE_LIMIT_KEY, { limit, ttlMs } satisfies RateLimitOptions),
    UseGuards(RateLimitGuard),
  );
