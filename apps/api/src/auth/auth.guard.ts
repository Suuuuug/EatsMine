import {
  type CanActivate,
  type ExecutionContext,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import type { Request } from 'express';
import { AppException } from '../common/app-exception.js';
import type { AuthUser } from './auth-user.js';
import { SupabaseJwtVerifier } from './supabase-jwt.verifier.js';

export type AuthenticatedRequest = Request & { user: AuthUser };

/** Authorization: Bearer {Supabase access token} 를 검증하고 req.user 에 사용자를 넣는다. */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(private readonly verifier: SupabaseJwtVerifier) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [scheme, token] = (req.headers.authorization ?? '').split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      throw new AppException(
        'UNAUTHORIZED',
        '로그인이 필요해요.',
        HttpStatus.UNAUTHORIZED,
      );
    }
    try {
      req.user = await this.verifier.verify(token);
      return true;
    } catch (e) {
      this.logger.debug(
        `토큰 검증 실패: ${(e as Error).name} ${(e as Error).message}`,
      );
      throw new AppException(
        'UNAUTHORIZED',
        '로그인이 만료됐어요. 다시 로그인해 주세요.',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }
}

/**
 * 로그인을 선택으로 받는 공개 라우트용. 토큰이 맞으면 req.user를 채우고,
 * 없거나 틀리면(만료 포함) 비로그인으로 통과시킨다 — 공개 화면이 만료된 토큰 때문에 막히지 않도록.
 */
@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(private readonly verifier: SupabaseJwtVerifier) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    const [scheme, token] = (req.headers.authorization ?? '').split(' ');
    if (scheme?.toLowerCase() === 'bearer' && token) {
      try {
        req.user = await this.verifier.verify(token);
      } catch {
        req.user = undefined;
      }
    }
    return true;
  }
}
