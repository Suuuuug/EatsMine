import { Global, Module } from '@nestjs/common';
import { DbRateLimitStorage } from './db-rate-limit.storage.js';
import { RateLimitGuard } from './rate-limit.guard.js';
import { RateLimitStorage } from './rate-limit.storage.js';

/** 어느 모듈의 컨트롤러에서든 @RateLimit()을 쓸 수 있게 전역 모듈로 둔다. */
@Global()
@Module({
  providers: [{ provide: RateLimitStorage, useClass: DbRateLimitStorage }, RateLimitGuard],
  exports: [RateLimitStorage, RateLimitGuard],
})
export class RateLimitModule {}
