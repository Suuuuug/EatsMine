/** 한 키(라우트 + 사용자 IP)의 현재 카운터 상태 */
export type RateLimitRecord = {
  totalHits: number;
  /** 윈도우가 끝나기까지 남은 초 */
  timeToExpire: number;
  isBlocked: boolean;
  /** 차단이 풀리기까지 남은 초 (차단 아니면 0) */
  timeToBlockExpire: number;
};

/**
 * rate limit 카운터 저장소 (DI 토큰 겸 인터페이스).
 * 운영: DbRateLimitStorage (서버리스라 메모리 대신 Postgres) / 테스트: MemoryRateLimitStorage
 */
export abstract class RateLimitStorage {
  /**
   * 고정 윈도우 방식: ttlMs 동안 횟수를 세고, limit을 넘으면 blockMs 동안 차단한다.
   * 호출 한 번이 요청 한 번이다.
   */
  abstract increment(key: string, ttlMs: number, limit: number, blockMs: number): Promise<RateLimitRecord>;
}

/** 테스트·로컬용 메모리 저장소 (인스턴스마다 따로라 운영 서버리스에는 쓰지 않는다) */
export class MemoryRateLimitStorage extends RateLimitStorage {
  private readonly records = new Map<string, { hits: number; expiresAt: number; blockedUntil: number }>();

  async increment(key: string, ttlMs: number, limit: number, blockMs: number): Promise<RateLimitRecord> {
    const now = Date.now();
    let r = this.records.get(key);
    const blocked = r !== undefined && r.blockedUntil > now;
    if (!r || (!blocked && (r.blockedUntil > 0 || r.expiresAt <= now))) {
      r = { hits: 0, expiresAt: now + ttlMs, blockedUntil: 0 };
      this.records.set(key, r);
    }
    r.hits++;
    if (!blocked && r.hits > limit) r.blockedUntil = now + blockMs;
    const timeToBlockExpire = Math.max(Math.ceil((r.blockedUntil - now) / 1000), 0);
    return {
      totalHits: r.hits,
      timeToExpire: Math.max(Math.ceil((r.expiresAt - now) / 1000), 0),
      isBlocked: timeToBlockExpire > 0,
      timeToBlockExpire,
    };
  }
}
