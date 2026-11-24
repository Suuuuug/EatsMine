import {
  type INestApplication,
  StandardSchemaValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthGuard } from '../auth/auth.guard.js';
import { HttpExceptionFilter } from '../common/http-exception.filter.js';
import { RateLimitGuard } from '../common/rate-limit/rate-limit.guard.js';
import { MeRecordsController } from './me-records.controller.js';
import { MeRecordsService } from './me-records.service.js';
import { ReviewsController } from './reviews.controller.js';
import { ReviewsService } from './reviews.service.js';

const user = {
  id: '6f1c2a3e-1111-4222-8333-944455556666',
  email: null,
  avatarUrl: null,
};
const MER_URL = 'https://web.paybooc.ai/mer/web/profile/bQSyX0QU5duyTaDXVqWW5A';

describe('리뷰·내 기록 API', () => {
  let app: INestApplication;
  const reviews = {
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    listMine: vi.fn(),
  };
  const records = { territories: vi.fn(), collection: vi.fn() };
  let loggedIn = true;

  beforeEach(async () => {
    vi.clearAllMocks();
    loggedIn = true;
    const moduleRef = await Test.createTestingModule({
      controllers: [ReviewsController, MeRecordsController],
      providers: [
        { provide: ReviewsService, useValue: reviews },
        { provide: MeRecordsService, useValue: records },
      ],
    })
      // 토큰 검증은 auth.spec에서 확인 — 여기서는 로그인 여부만 흉내
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: (ctx: {
          switchToHttp: () => { getRequest: () => Record<string, unknown> };
        }) => {
          if (!loggedIn) return false;
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

  describe('POST /reviews', () => {
    it('기본값(private)과 빈 후기 정리 후 서비스에 넘긴다', async () => {
      reviews.create.mockResolvedValue({ id: 1 });
      await request(server())
        .post('/reviews')
        .send({
          merUrl: MER_URL,
          restaurantName: ' 카페시나브로 ',
          rating: 5,
          content: '   ',
        })
        .expect(201);
      expect(reviews.create).toHaveBeenCalledWith(user, {
        merUrl: MER_URL,
        restaurantName: '카페시나브로',
        rating: 5,
        content: undefined,
        visibility: 'private',
      });
    });

    it('별점만으로도 작성할 수 있고 음식·방문일·공개 범위를 받는다', async () => {
      reviews.create.mockResolvedValue({ id: 1 });
      await request(server())
        .post('/reviews')
        .send({
          merUrl: MER_URL,
          restaurantName: 'A',
          rating: 3,
          foodId: 2,
          visitedAt: '2026-11-01',
          visibility: 'public',
        })
        .expect(201);
      expect(reviews.create).toHaveBeenCalledWith(
        user,
        expect.objectContaining({
          foodId: 2,
          visitedAt: '2026-11-01',
          visibility: 'public',
        }),
      );
    });

    it.each([
      [{ restaurantName: 'A', rating: 5 }, 'merUrl 누락'],
      [{ merUrl: MER_URL, rating: 5 }, '매장명 누락'],
      [{ merUrl: MER_URL, restaurantName: 'A', rating: 0 }, '별점 0'],
      [{ merUrl: MER_URL, restaurantName: 'A', rating: 6 }, '별점 6'],
      [{ merUrl: MER_URL, restaurantName: 'A', rating: 4.5 }, '별점 소수'],
      [
        {
          merUrl: MER_URL,
          restaurantName: 'A',
          rating: 5,
          content: '가'.repeat(501),
        },
        '후기 501자',
      ],
      [
        {
          merUrl: MER_URL,
          restaurantName: 'A',
          rating: 5,
          visitedAt: '2026/11/01',
        },
        '방문일 형식',
      ],
      [
        {
          merUrl: MER_URL,
          restaurantName: 'A',
          rating: 5,
          visitedAt: '2999-01-01',
        },
        '미래 방문일',
      ],
      [
        {
          merUrl: MER_URL,
          restaurantName: 'A',
          rating: 5,
          visibility: 'friends',
        },
        '공개 범위',
      ],
      [
        { merUrl: MER_URL, restaurantName: 'A', rating: 5, foodId: 0 },
        '음식 ID 0',
      ],
    ])('입력 오류는 400: %o (%s)', async (body, _reason) => {
      const res = await request(server())
        .post('/reviews')
        .send(body)
        .expect(400);
      expect(res.body.error.code).toBe('BAD_REQUEST');
      expect(reviews.create).not.toHaveBeenCalled();
    });

    it('로그인하지 않으면 막힌다', async () => {
      loggedIn = false;
      await request(server())
        .post('/reviews')
        .send({ merUrl: MER_URL, restaurantName: 'A', rating: 5 })
        .expect(403);
      expect(reviews.create).not.toHaveBeenCalled();
    });
  });

  describe('PATCH·DELETE /reviews/:id', () => {
    it('PATCH: 음식 지우기(null)와 빈 후기(null)를 넘긴다', async () => {
      reviews.update.mockResolvedValue({ id: 7 });
      await request(server())
        .patch('/reviews/7')
        .send({ foodId: null, content: '' })
        .expect(200);
      expect(reviews.update).toHaveBeenCalledWith(user, 7, {
        foodId: null,
        content: null,
      });
    });

    it('PATCH: 바꿀 항목이 없으면 400', async () => {
      await request(server()).patch('/reviews/7').send({}).expect(400);
      expect(reviews.update).not.toHaveBeenCalled();
    });

    it('DELETE: 204', async () => {
      reviews.remove.mockResolvedValue(undefined);
      await request(server()).delete('/reviews/7').expect(204);
      expect(reviews.remove).toHaveBeenCalledWith(user, 7);
    });

    it.each(['abc', '0'])('잘못된 ID(%s)는 400', async (id) => {
      await request(server()).delete(`/reviews/${id}`).expect(400);
      expect(reviews.remove).not.toHaveBeenCalled();
    });
  });

  describe('GET /me/*', () => {
    it('reviews·territories·collection', async () => {
      reviews.listMine.mockResolvedValue([{ id: 1 }]);
      records.territories.mockResolvedValue({
        count: 1,
        total: 230,
        items: [],
      });
      records.collection.mockResolvedValue({ count: 0, total: 43, items: [] });
      expect(
        (await request(server()).get('/me/reviews').expect(200)).body,
      ).toEqual({ items: [{ id: 1 }] });
      expect(
        (await request(server()).get('/me/territories').expect(200)).body.total,
      ).toBe(230);
      expect(
        (await request(server()).get('/me/collection').expect(200)).body.total,
      ).toBe(43);
      expect(reviews.listMine).toHaveBeenCalledWith(user.id);
    });
  });
});
