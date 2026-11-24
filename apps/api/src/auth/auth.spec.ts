import { Controller, Get, type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import {
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  type JWTPayload,
  SignJWT,
} from 'jose';
import request from 'supertest';
import { HttpExceptionFilter } from '../common/http-exception.filter.js';
import type { AuthUser } from './auth-user.js';
import { Auth, CurrentUser } from './auth.decorators.js';
import { AuthGuard } from './auth.guard.js';
import { SUPABASE_JWKS, SupabaseJwtVerifier } from './supabase-jwt.verifier.js';

const SUPABASE_URL = 'https://test-ref.supabase.co';
const ISSUER = `${SUPABASE_URL}/auth/v1`;
const USER_ID = '6f1c2a3e-1111-4222-8333-944455556666';

@Controller()
class TestController {
  @Get('private')
  @Auth()
  me(@CurrentUser() user: AuthUser) {
    return user;
  }

  @Get('public')
  open() {
    return { ok: true };
  }
}

describe('Supabase 토큰 인증', () => {
  let app: INestApplication;
  let sign: (
    payload: JWTPayload,
    opts?: { exp?: string; key?: CryptoKey; alg?: string },
  ) => Promise<string>;

  beforeAll(async () => {
    // Supabase 대신 테스트용 ES256 키로 서명·검증
    const { publicKey, privateKey } = await generateKeyPair('ES256');
    const other = await generateKeyPair('ES256');
    const jwks = createLocalJWKSet({
      keys: [{ ...(await exportJWK(publicKey)), alg: 'ES256', kid: 'test' }],
    });

    sign = (payload, opts = {}) =>
      new SignJWT({
        iss: ISSUER,
        aud: 'authenticated',
        sub: USER_ID,
        ...payload,
      })
        .setProtectedHeader({ alg: opts.alg ?? 'ES256', kid: 'test' })
        .setIssuedAt()
        .setExpirationTime(opts.exp ?? '1h')
        .sign(opts.key ?? privateKey);
    // 다른 키로 서명한 토큰용
    otherKey = other.privateKey;

    const moduleRef = await Test.createTestingModule({
      controllers: [TestController],
      providers: [
        SupabaseJwtVerifier,
        AuthGuard,
        { provide: SUPABASE_JWKS, useValue: jwks },
        { provide: ConfigService, useValue: { get: () => SUPABASE_URL } },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  let otherKey: CryptoKey;

  afterAll(async () => {
    await app.close();
  });

  const get = (token?: string) => {
    const req = request(app.getHttpServer()).get('/private');
    return token ? req.set('authorization', `Bearer ${token}`) : req;
  };

  it('유효한 토큰이면 사용자 정보를 꺼낸다 (구글 사진 포함)', async () => {
    const token = await sign({
      email: 'user@example.com',
      user_metadata: {
        avatar_url: 'https://lh3.googleusercontent.com/a/photo',
        full_name: '실명',
      },
    });
    const res = await get(token).expect(200);
    expect(res.body).toEqual({
      id: USER_ID,
      email: 'user@example.com',
      avatarUrl: 'https://lh3.googleusercontent.com/a/photo',
    });
  });

  it('토큰이 없으면 401 "로그인이 필요해요"', async () => {
    const res = await get().expect(401);
    expect(res.body.error).toEqual({
      code: 'UNAUTHORIZED',
      message: '로그인이 필요해요.',
    });
  });

  it.each<[string, () => Promise<string>]>([
    ['만료', () => sign({}, { exp: '-5m' })],
    ['다른 발급자', () => sign({ iss: 'https://evil.supabase.co/auth/v1' })],
    ['다른 대상(aud)', () => sign({ aud: 'anon' })],
    ['다른 키로 서명', () => sign({}, { key: otherKey })],
    ['sub 없음', () => sign({ sub: undefined })],
    ['형식 오류', async () => 'not.a.jwt'],
  ])('%s 토큰은 401', async (_name, makeToken) => {
    const res = await get(await makeToken()).expect(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('Bearer가 아닌 방식은 401', async () => {
    const token = await sign({});
    await request(app.getHttpServer())
      .get('/private')
      .set('authorization', `Basic ${token}`)
      .expect(401);
  });

  it('@Auth()가 없는 라우트는 토큰 없이 열린다', async () => {
    await request(app.getHttpServer()).get('/public').expect(200);
  });
});
