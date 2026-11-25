import {
  type INestApplication,
  StandardSchemaValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthGuard, OptionalAuthGuard } from '../auth/auth.guard.js';
import { HttpExceptionFilter } from '../common/http-exception.filter.js';
import { RateLimitGuard } from '../common/rate-limit/rate-limit.guard.js';
import { TerritoriesController } from '../territories/territories.controller.js';
import {
  TerritoriesService,
  toRankingEntries,
} from '../territories/territories.service.js';
import { MeSharesController, SharesController } from './shares.controller.js';
import {
  generateShareId,
  SharesService,
  toMySharesDto,
} from './shares.service.js';

const user = {
  id: '6f1c2a3e-1111-4222-8333-944455556666',
  email: null,
  avatarUrl: null,
};

describe('공유 링크·공유 영토 API', () => {
  let app: INestApplication;
  const shares = {
    create: vi.fn(),
    remove: vi.fn(),
    view: vi.fn(),
    listMine: vi.fn(),
  };
  const territories = { owners: vi.fn(), ranking: vi.fn() };
  let optionalLoggedIn = false;

  beforeEach(async () => {
    vi.clearAllMocks();
    optionalLoggedIn = false;
    const moduleRef = await Test.createTestingModule({
      controllers: [
        MeSharesController,
        SharesController,
        TerritoriesController,
      ],
      providers: [
        { provide: SharesService, useValue: shares },
        { provide: TerritoriesService, useValue: territories },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: (ctx: {
          switchToHttp: () => { getRequest: () => Record<string, unknown> };
        }) => {
          ctx.switchToHttp().getRequest().user = user;
          return true;
        },
      })
      .overrideGuard(OptionalAuthGuard)
      .useValue({
        canActivate: (ctx: {
          switchToHttp: () => { getRequest: () => Record<string, unknown> };
        }) => {
          if (optionalLoggedIn) ctx.switchToHttp().getRequest().user = user;
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

  const server = () => app.getHttpServer();

  it('POST /me/shares: 종류를 받아 링크를 만든다', async () => {
    shares.create.mockResolvedValue({ id: 'k3Xz9aQ2mP', type: 'territory' });
    const res = await request(server())
      .post('/me/shares')
      .send({ type: 'territory' })
      .expect(201);
    expect(shares.create).toHaveBeenCalledWith(user, 'territory');
    expect(res.body.id).toBe('k3Xz9aQ2mP');
  });

  it.each([{}, { type: 'reviews' }])(
    'POST /me/shares 잘못된 종류는 400: %o',
    async (body) => {
      await request(server()).post('/me/shares').send(body).expect(400);
      expect(shares.create).not.toHaveBeenCalled();
    },
  );

  it('GET /me/shares: 종류별 공유 상태', async () => {
    const body = {
      territory: { id: 'k3Xz9aQ2mP', type: 'territory', createdAt: 'x' },
      collection: null,
    };
    shares.listMine.mockResolvedValue(body);
    const res = await request(server()).get('/me/shares').expect(200);
    expect(shares.listMine).toHaveBeenCalledWith(user.id);
    expect(res.body).toEqual(body);
  });

  it('DELETE /me/shares/:type → 204', async () => {
    await request(server()).delete('/me/shares/collection').expect(204);
    expect(shares.remove).toHaveBeenCalledWith(user.id, 'collection');
  });

  it('DELETE /me/shares/잘못된종류 → 400', async () => {
    await request(server()).delete('/me/shares/everything').expect(400);
  });

  it('GET /shares/:id 공개 화면', async () => {
    shares.view.mockResolvedValue({
      type: 'territory',
      nickname: 'A',
      count: 1,
    });
    await request(server()).get('/shares/k3Xz9aQ2mP').expect(200);
    expect(shares.view).toHaveBeenCalledWith('k3Xz9aQ2mP');
  });

  it.each(['short', 'k3Xz9aQ2mP!', 'k3Xz9aQ2mPX'])(
    'GET /shares/%s 형식 오류는 400',
    async (id) => {
      await request(server())
        .get(`/shares/${encodeURIComponent(id)}`)
        .expect(400);
      expect(shares.view).not.toHaveBeenCalled();
    },
  );

  it('GET /territories', async () => {
    territories.owners.mockResolvedValue([
      { regionCode: '11140', ownerNickname: 'A', reviewCount: 3 },
    ]);
    const res = await request(server()).get('/territories').expect(200);
    expect(res.body).toEqual({
      windowDays: 30,
      items: [{ regionCode: '11140', ownerNickname: 'A', reviewCount: 3 }],
    });
  });

  it('GET /territories/:regionCode/ranking: 비로그인이면 내 ID 없이', async () => {
    territories.ranking.mockResolvedValue({ items: [], me: null });
    await request(server()).get('/territories/11140/ranking').expect(200);
    expect(territories.ranking).toHaveBeenCalledWith('11140', null);
  });

  it('GET /territories/:regionCode/ranking: 로그인하면 내 ID로', async () => {
    optionalLoggedIn = true;
    territories.ranking.mockResolvedValue({ items: [], me: null });
    await request(server()).get('/territories/11140/ranking').expect(200);
    expect(territories.ranking).toHaveBeenCalledWith('11140', user.id);
  });

  it.each(['1114', '41', 'abcde'])(
    'GET /territories/%s/ranking 형식 오류는 400',
    async (code) => {
      await request(server()).get(`/territories/${code}/ranking`).expect(400);
      expect(territories.ranking).not.toHaveBeenCalled();
    },
  );
});

describe('toRankingEntries', () => {
  const row = (position: number, userId: string, reviewCount: number) => ({
    position: String(position),
    user_id: userId,
    review_count: reviewCount,
    nickname: `닉${position}`,
    rank: 'rookie' as const,
    avatar_url: null,
  });

  it('상위 10명은 items, 내 순위는 목록 밖이어도 me', () => {
    const rows = [
      ...Array.from({ length: 10 }, (_, i) => row(i + 1, `u${i + 1}`, 20 - i)),
      row(14, 'me', 2),
    ];
    const { items, me } = toRankingEntries(rows, 'me');
    expect(items).toHaveLength(10);
    expect(items[0]).toEqual({
      position: 1,
      nickname: '닉1',
      rank: 'rookie',
      rankLabel: '새내기 탐험가',
      avatarUrl: null,
      reviewCount: 20,
      isMe: false,
    });
    expect(me).toMatchObject({ position: 14, reviewCount: 2, isMe: true });
  });

  it('내가 상위권이면 items에도 isMe, 비로그인이면 me는 null', () => {
    const rows = [row(1, 'me', 5), row(2, 'u2', 3)];
    expect(toRankingEntries(rows, 'me').items[0].isMe).toBe(true);
    expect(toRankingEntries(rows, null).me).toBeNull();
  });
});

describe('toMySharesDto', () => {
  it('없는 종류는 null, 있는 종류는 링크', () => {
    expect(toMySharesDto([])).toEqual({ territory: null, collection: null });
    expect(
      toMySharesDto([
        {
          id: 'AbCdE12345',
          shareType: 'collection',
          createdAt: new Date('2026-11-25T00:00:00Z'),
        },
      ]),
    ).toEqual({
      territory: null,
      collection: {
        id: 'AbCdE12345',
        type: 'collection',
        createdAt: '2026-11-25T00:00:00.000Z',
      },
    });
  });
});

describe('generateShareId', () => {
  it('영문 대소문자·숫자 10자, 매번 다름', () => {
    const ids = new Set(Array.from({ length: 200 }, generateShareId));
    expect(ids.size).toBe(200);
    for (const id of ids) expect(id).toMatch(/^[A-Za-z0-9]{10}$/);
  });
});
