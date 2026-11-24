import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * 사용자 IP 기준 rate limit.
 * Vercel은 실제 사용자 IP를 x-vercel-forwarded-for / x-real-ip 헤더로 넘기고, 이 헤더는 Vercel이 덮어써서 위조할 수 없다.
 * (Vercel 밖에서 운영하면 이 헤더는 위조 가능하므로 그 환경의 신뢰 가능한 헤더로 바꿔야 한다.)
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(req: Record<string, any>): Promise<string> {
    const headers: Record<string, string | string[] | undefined> = req.headers ?? {};
    const forwarded = headers['x-vercel-forwarded-for'] ?? headers['x-real-ip'];
    const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    const ip = value?.split(',')[0]?.trim();
    return ip || req.ip;
  }
}
