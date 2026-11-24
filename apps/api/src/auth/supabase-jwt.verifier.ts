import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createRemoteJWKSet,
  jwtVerify,
  type JWTPayload,
  type JWTVerifyGetKey,
} from 'jose';
import type { Env } from '../config/env.js';
import type { AuthUser } from './auth-user.js';

/** 토큰 서명 검증용 공개 키 묶음. 테스트에서는 로컬 키로 바꿔 끼운다. */
export const SUPABASE_JWKS = Symbol('SUPABASE_JWKS');

export const supabaseJwksProvider = {
  provide: SUPABASE_JWKS,
  inject: [ConfigService],
  useFactory: (config: ConfigService<Env, true>): JWTVerifyGetKey =>
    createRemoteJWKSet(
      new URL(
        `${config.get('SUPABASE_URL', { infer: true })}/auth/v1/.well-known/jwks.json`,
      ),
    ),
};

/**
 * Supabase Auth가 발급한 access token 검증 (D6).
 * 우리 프로젝트는 ES256 비대칭 키로 서명하므로 비밀값 없이 공개 키(JWKS)로 검증한다.
 */
@Injectable()
export class SupabaseJwtVerifier {
  private readonly issuer: string;

  constructor(
    @Inject(SUPABASE_JWKS) private readonly jwks: JWTVerifyGetKey,
    config: ConfigService<Env, true>,
  ) {
    this.issuer = `${config.get('SUPABASE_URL', { infer: true })}/auth/v1`;
  }

  /** 서명·발급자·대상·만료를 검증한다. 실패하면 jose 에러를 그대로 던진다. */
  async verify(token: string): Promise<AuthUser> {
    const { payload } = await jwtVerify(token, this.jwks, {
      issuer: this.issuer,
      audience: 'authenticated',
      algorithms: ['ES256'],
      clockTolerance: '30s',
    });
    if (!payload.sub) throw new Error('토큰에 사용자 ID(sub)가 없습니다');
    return toAuthUser(payload);
  }
}

function toAuthUser(payload: JWTPayload): AuthUser {
  const meta = (payload.user_metadata ?? {}) as Record<string, unknown>;
  const avatar = [meta.avatar_url, meta.picture].find(
    (v): v is string => typeof v === 'string' && v.startsWith('https://'),
  );
  return {
    id: payload.sub!,
    email: typeof payload.email === 'string' ? payload.email : null,
    avatarUrl: avatar ?? null,
  };
}
