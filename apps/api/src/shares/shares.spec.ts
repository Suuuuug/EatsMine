import {
  type INestApplication,
  StandardSchemaValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthGuard } from '../auth/auth.guard.js';
import { HttpExceptionFilter } from '../common/http-exception.filter.js';
import { RateLimitGuard } from '../common/rate-limit/rate-limit.guard.js';
import { TerritoriesController } from '../territories/territories.controller.js';
import { TerritoriesService } from '../territories/territories.service.js';
import { MeSharesController, SharesController } from './shares.controller.js';
import { generateShareId, SharesService } from './shares.service.js';

const user = {
  id: '6f1c2a3e-1111-4222-8333-944455556666',
  email: null,
  avatarUrl: null,
};

describe('공유 링크·공유 영토 API', () => {
  let app: INestApplication;
  const shares = { create: vi.fn(), remove: vi.fn(), view: vi.fn() };
  const territories = { owners: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
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
});

describe('generateShareId', () => {
  it('영문 대소문자·숫자 10자, 매번 다름', () => {
    const ids = new Set(Array.from({ length: 200 }, generateShareId));
    expect(ids.size).toBe(200);
    for (const id of ids) expect(id).toMatch(/^[A-Za-z0-9]{10}$/);
  });
});
