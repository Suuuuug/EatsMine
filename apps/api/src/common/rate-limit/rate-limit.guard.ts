import { type CanActivate, type ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { createHash } from 'node:crypto';
import { AppException } from '../app-exception.js';
import { RateLimitStorage } from './rate-limit.storage.js';

export const RATE_LIMIT_KEY = 'eatsmine:rate-limit';
export type RateLimitOptions = { limit: number; ttlMs: number };

/**
 * @RateLimit(limit, ttlMs)이 붙은 라우트를 사용자 IP 기준으로 제한한다.
 * (@nestjs/throttler는 CommonJS라 Vercel에서 ESM 전용 Nest 12를 require하다 실패해서 직접 구현)
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly storage: RateLimitStorage,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<RateLimitOptions | undefined>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!options) return true;

    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    // 라우트별·IP별 키. IP는 해시해서 저장한다 (DB에 원문 IP를 남기지 않음)
    const key = createHash('sha256')
      .update(`${context.getClass().name}.${context.getHandler().name}:${clientIp(req)}`)
      .digest('hex');

    const record = await this.storage.increment(key, options.ttlMs, options.limit, options.ttlMs);
    if (record.isBlocked) {
      http.getResponse<Response>().setHeader('Retry-After', String(record.timeToBlockExpire));
      throw new AppException('RATE_LIMITED', '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.', HttpStatus.TOO_MANY_REQUESTS);
    }
    return true;
  }
}

/**
 * 사용자 IP. Vercel은 실제 사용자 IP를 x-vercel-forwarded-for / x-real-ip 헤더로 넘기고, 이 헤더는 Vercel이 덮어써서 위조할 수 없다.
 * (Vercel 밖에서 운영하면 이 헤더는 위조 가능하므로 그 환경의 신뢰 가능한 헤더로 바꿔야 한다.)
 */
export function clientIp(req: Pick<Request, 'headers' | 'ip'>): string {
  const forwarded = req.headers['x-vercel-forwarded-for'] ?? req.headers['x-real-ip'];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return value?.split(',')[0]?.trim() || req.ip || 'unknown';
}
