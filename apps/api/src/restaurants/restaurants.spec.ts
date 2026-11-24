import {
  type INestApplication,
  StandardSchemaValidationPipe,
} from '@nestjs/common';
import { getDrizzleToken } from '@nestjs/drizzle';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { HttpExceptionFilter } from '../common/http-exception.filter.js';
import { AppThrottlerGuard } from '../common/rate-limit/app-throttler.guard.js';
import { EatplClient } from '../eatpl/eatpl.client.js';
import { AddressMatcher } from '../regions/address-matcher.js';
import { RestaurantsController } from './restaurants.controller.js';
import { RestaurantsService } from './restaurants.service.js';

const place = (id: string, address: string) => ({
  id,
  address,
  name: id,
  merUrl: `https://web.paybooc.ai/p/${id}`,
});

describe('GET /restaurants', () => {
  let app: INestApplication | undefined;
  const eatpl = { search: vi.fn() };
  const matcher = { match: vi.fn() };

  /** regions 조회 결과를 정해서 앱을 띄운다 (drizzle select 체인 최소 목) */
  async function createApp(regionRows: unknown[]) {
    const db = {
      select: () => ({
        from: () => ({ where: () => ({ limit: async () => regionRows }) }),
      }),
    };
    const moduleRef = await Test.createTestingModule({
      controllers: [RestaurantsController],
      providers: [
        RestaurantsService,
        { provide: EatplClient, useValue: eatpl },
        { provide: AddressMatcher, useValue: matcher },
        { provide: getDrizzleToken(), useValue: db },
      ],
    })
      .overrideGuard(AppThrottlerGuard) // rate limit은 rate-limit.spec에서 검증
      .useValue({ canActivate: () => true })
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new StandardSchemaValidationPipe());
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
    return app.getHttpServer();
  }

  beforeEach(() => vi.clearAllMocks());
  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('지역 검색어로 잇플을 조회하고 다른 지역 결과는 걸러낸다', async () => {
    const server = await createApp([
      { code: '11140', fullName: '서울특별시 중구', eatplQuery: '서울 중구' },
    ]);
    eatpl.search.mockResolvedValue([
      place('a', '서울 중구 1'),
      place('b', '대전 중구 2'),
      place('c', '서울특별시 중구 3'),
    ]);
    matcher.match.mockImplementation(async (addr: string) =>
      addr.startsWith('대전') ? '30140' : '11140',
    );

    const res = await request(server)
      .get('/restaurants')
      .query({ regionCode: '11140', genre: '고기구이' })
      .expect(200);

    expect(eatpl.search).toHaveBeenCalledWith({
      location: '서울 중구',
      genre: '고기구이',
    });
    expect(res.body.region).toEqual({
      code: '11140',
      fullName: '서울특별시 중구',
    });
    expect(res.body.items.map((p: { id: string }) => p.id)).toEqual(['a', 'c']);
    expect(res.body.source).toBe('eat.pl 잇플 · BC카드 결제 데이터 기반');
  });

  it('없는 지역은 404 NOT_FOUND', async () => {
    const server = await createApp([]);
    const res = await request(server)
      .get('/restaurants')
      .query({ regionCode: '99999' })
      .expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(eatpl.search).not.toHaveBeenCalled();
  });

  it.each([
    [{}, 'regionCode 누락'],
    [{ regionCode: '1114' }, '5자리 아님'],
    [{ regionCode: '11140', genre: '한식' }, '43종 밖의 업종'],
  ])('입력 오류는 400: %o (%s)', async (query, _reason) => {
    const server = await createApp([]);
    const res = await request(server)
      .get('/restaurants')
      .query(query)
      .expect(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });
});
