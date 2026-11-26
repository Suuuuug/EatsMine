import {
  type INestApplication,
  StandardSchemaValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthGuard } from '../auth/auth.guard.js';
import { HttpExceptionFilter } from '../common/http-exception.filter.js';
import { RateLimitGuard } from '../common/rate-limit/rate-limit.guard.js';
import { MeController } from './me.controller.js';
import { generateNickname, ProfilesService } from './profiles.service.js';
import { rankForReviewCount, rankLabel } from './ranks.js';

const user = {
  id: '6f1c2a3e-1111-4222-8333-944455556666',
  email: null,
  avatarUrl: null,
};
const profile = {
  id: user.id,
  nickname: '미식탐험가4821',
  rank: 'rookie' as const,
  avatarUrl: null,
  createdAt: new Date('2026-11-24T00:00:00Z'),
  updatedAt: new Date('2026-11-24T00:00:00Z'),
};

describe('GET/PATCH /me', () => {
  let app: INestApplication;
  const service = {
    getOrCreate: vi.fn(),
    updateNickname: vi.fn(),
    countReviews: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [MeController],
      providers: [{ provide: ProfilesService, useValue: service }],
    })
      // 토큰 검증은 auth.spec에서 확인 — 여기서는 로그인된 사용자로 고정
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: (ctx: {
          switchToHttp: () => { getRequest: () => Record<string, unknown> };
        }) => {
          ctx.switchToHttp().getRequest().user = user;
          return true;
        },
      })
      .overrideGuard(RateLimitGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new StandardSchemaValidationPipe());
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /me: 프로필을 만들거나 가져와 등급 이름과 함께 돌려준다', async () => {
    service.getOrCreate.mockResolvedValue(profile);
    service.countReviews.mockResolvedValue(201);
    const res = await request(app.getHttpServer()).get('/me').expect(200);
    expect(service.getOrCreate).toHaveBeenCalledWith(user);
    expect(service.countReviews).toHaveBeenCalledWith(user.id);
    expect(res.body).toEqual({
      id: user.id,
      nickname: '미식탐험가4821',
      rank: 'rookie',
      rankLabel: '새내기 탐험가',
      avatarUrl: null,
      reviewCount: 201,
      createdAt: '2026-11-24T00:00:00.000Z',
    });
  });

  it('PATCH /me: 공백을 정리한 닉네임으로 바꾼다', async () => {
    service.updateNickname.mockResolvedValue({
      ...profile,
      nickname: '해운대 정복자',
    });
    service.countReviews.mockResolvedValue(3);
    const res = await request(app.getHttpServer())
      .patch('/me')
      .send({ nickname: '  해운대   정복자 ' })
      .expect(200);
    expect(service.updateNickname).toHaveBeenCalledWith(user, '해운대 정복자');
    expect(res.body.nickname).toBe('해운대 정복자');
    expect(res.body.reviewCount).toBe(3);
  });

  it.each([
    [{}, '누락'],
    [{ nickname: '가' }, '1자'],
    [{ nickname: '가'.repeat(13) }, '13자'],
    [{ nickname: '<script>' }, '허용 안 되는 문자'],
    [{ nickname: '😀😀😀' }, '이모지'],
  ])('PATCH /me 입력 오류는 400: %o (%s)', async (body, _reason) => {
    const res = await request(app.getHttpServer())
      .patch('/me')
      .send(body)
      .expect(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
    expect(service.updateNickname).not.toHaveBeenCalled();
  });
});

describe('닉네임·등급', () => {
  it('자동 닉네임은 미식탐험가 + 4자리 숫자', () => {
    for (let i = 0; i < 20; i++)
      expect(generateNickname()).toMatch(/^미식탐험가\d{4}$/);
  });

  it.each([
    [0, 'rookie'],
    [2, 'rookie'],
    [3, 'local'],
    [9, 'local'],
    [10, 'conqueror'],
    [29, 'conqueror'],
    [30, 'master'],
    [500, 'master'],
  ])('리뷰 %i개 → %s', (count, rank) => {
    expect(rankForReviewCount(count)).toBe(rank);
  });

  it('등급 표시 이름', () => {
    expect(rankLabel('master')).toBe('전국 미식왕');
  });
});

describe('ProfilesService.getOrCreate', () => {
  it('탈퇴로 계정이 지워져 프로필 FK가 깨지면 401', async () => {
    const fkError = Object.assign(new Error('Failed query'), {
      cause: { code: '23503' },
    });
    const db = {
      insert: () => ({
        values: () => ({ onConflictDoNothing: () => Promise.reject(fkError) }),
      }),
    };
    const svc = new ProfilesService(db as never);
    await expect(svc.getOrCreate(user)).rejects.toMatchObject({
      status: 401,
      code: 'UNAUTHORIZED',
    });
  });

  it('다른 DB 오류는 그대로 던진다', async () => {
    const db = {
      insert: () => ({
        values: () => ({
          onConflictDoNothing: () => Promise.reject(new Error('boom')),
        }),
      }),
    };
    const svc = new ProfilesService(db as never);
    await expect(svc.getOrCreate(user)).rejects.toThrow('boom');
  });
});
