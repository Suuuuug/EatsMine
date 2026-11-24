import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { DbThrottlerStorage } from './db-throttler.storage.js';

@Module({
  providers: [DbThrottlerStorage],
  exports: [DbThrottlerStorage],
})
class RateLimitStorageModule {}

/** rate limit 설정. 실제 제한 값은 각 라우트의 @RateLimit()에서 지정한다. */
@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [RateLimitStorageModule],
      inject: [DbThrottlerStorage],
      useFactory: (storage: DbThrottlerStorage) => ({
        // @RateLimit()이 덮어쓰는 기본값
        throttlers: [{ name: 'default', ttl: 60_000, limit: 60 }],
        storage,
      }),
    }),
  ],
})
export class RateLimitModule {}
