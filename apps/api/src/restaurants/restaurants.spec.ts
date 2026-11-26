import {
  type INestApplication,
  StandardSchemaValidationPipe,
} from '@nestjs/common';
import { getDrizzleToken } from '@nestjs/drizzle';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { HttpExceptionFilter } from '../common/http-exception.filter.js';
import { RateLimitGuard } from '../common/rate-limit/rate-limit.guard.js';
import { EatplClient } from '../eatpl/eatpl.client.js';
import { FoodsService } from '../foods/foods.service.js';
import { AddressMatcher } from '../regions/address-matcher.js';
import { ReviewSummaryService } from '../reviews/review-summary.service.js';
import { RestaurantsController } from './restaurants.controller.js';
import { RestaurantsService } from './restaurants.service.js';

const place = (
  id: string,
  address: string,
  rankLocal: number | null = null,
) => ({
  id,
  address,
  name: id,
  rankLocal,
  merUrl: `https://web.paybooc.ai/p/${id}`,
});

const SEOUL_JUNG = {
  code: '11140',
  fullName: '서울특별시 중구',
  eatplQuery: '서울 중구',
};
const SEOGWIPO = {
  code: '50130',
  fullName: '제주특별자치도 서귀포시',
  eatplQuery: '제주 서귀포시',
};

describe('GET /restaurants', () => {
  let app: INestApplication | undefined;
  const eatpl = { search: vi.fn() };
  const matcher = { match: vi.fn() };
  const foods = { searchInfo: vi.fn() };
  const summaries = { forRestaurants: vi.fn() };

  /** regions 조회 결과(코드별)를 정해서 앱을 띄운다 (drizzle select 체인 최소 목) */
  async function createApp(regionRows: (typeof SEOUL_JUNG)[]) {
    let lastCode: string | undefined;
    const db = {
      select: () => ({
        from: () => ({
          where: (cond: unknown) => {
            // eq(regions.code, X) 조건에서 코드를 꺼내기 어려워, 호출 순서 대신 요청 값으로 찾는다
            void cond;
            return {
              limit: async () =>
                regionRows.filter((r) => !lastCode || r.code === lastCode),
            };
          },
        }),
      }),
    };
    const moduleRef = await Test.createTestingModule({
      controllers: [RestaurantsController],
      providers: [
        RestaurantsService,
        { provide: EatplClient, useValue: eatpl },
        { provide: AddressMatcher, useValue: matcher },
        { provide: FoodsService, useValue: foods },
        { provide: ReviewSummaryService, useValue: summaries },
        { provide: getDrizzleToken(), useValue: db },
      ],
    })
      .overrideGuard(RateLimitGuard) // rate limit은 rate-limit.spec에서 검증
      .useValue({ canActivate: () => true })
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new StandardSchemaValidationPipe());
    app.useGlobalFilters(new HttpExceptionFilter());
    app.use(
      (
        req: { query: Record<string, string> },
        _res: unknown,
        next: () => void,
      ) => {
        lastCode = req.query?.regionCode;
        next();
      },
    );
    await app.init();
    return app.getHttpServer();
  }

  beforeEach(() => {
    vi.clearAllMocks();
    summaries.forRestaurants.mockResolvedValue(new Map());
    // 주소 앞부분으로 지역 판별 (테스트용)
    matcher.match.mockImplementation(async (addr: string) =>
      addr.startsWith('대전')
        ? '30140'
        : addr.startsWith('제주')
          ? '50130'
          : '11140',
    );
  });
  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('지역 검색어로 잇플을 조회하고 다른 지역 결과는 걸러낸다', async () => {
    const server = await createApp([SEOUL_JUNG]);
    eatpl.search.mockResolvedValue([
      place('a', '서울 중구 1'),
      place('b', '대전 중구 2'),
      place('c', '서울특별시 중구 3'),
    ]);

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
    expect(res.body).not.toHaveProperty('matchedBy');
  });

  it('업종 여러 개는 업종마다 조회해 중복 제거 후 지역 순위순으로 합친다', async () => {
    const server = await createApp([SEOUL_JUNG]);
    eatpl.search.mockImplementation(async ({ genre }: { genre: string }) =>
      genre === '카페'
        ? [place('a', '서울 중구 1', 5), place('x', '대전 중구 9', 1)]
        : [
            place('b', '서울 중구 2', 2),
            place('a', '서울 중구 1', 5),
            place('c', '서울 중구 3'),
          ],
    );

    const res = await request(server)
      .get('/restaurants?regionCode=11140&genre=카페&genre=분식&genre=카페')
      .expect(200);

    expect(eatpl.search).toHaveBeenCalledTimes(2);
    expect(eatpl.search).toHaveBeenCalledWith({
      location: '서울 중구',
      genre: '카페',
    });
    expect(eatpl.search).toHaveBeenCalledWith({
      location: '서울 중구',
      genre: '분식',
    });
    expect(res.body.items.map((p: { id: string }) => p.id)).toEqual([
      'b',
      'a',
      'c',
    ]);
    expect(res.body).not.toHaveProperty('matchedBy');
  });

  it('업종이 없으면 지역만으로 1번 조회한다', async () => {
    const server = await createApp([SEOUL_JUNG]);
    eatpl.search.mockResolvedValue([place('a', '서울 중구 1')]);
    await request(server)
      .get('/restaurants')
      .query({ regionCode: '11140' })
      .expect(200);
    expect(eatpl.search).toHaveBeenCalledTimes(1);
    expect(eatpl.search).toHaveBeenCalledWith({
      location: '서울 중구',
      genre: undefined,
    });
  });

  it('매장마다 공개 리뷰 요약을 붙이고 없으면 null', async () => {
    const server = await createApp([SEOUL_JUNG]);
    eatpl.search.mockResolvedValue([
      place('a', '서울 중구 1'),
      place('b', '서울 중구 2'),
    ]);
    const summaryA = {
      average: 4.5,
      count: 2,
      featured: {
        id: 9,
        nickname: '미식탐험가1234',
        rating: 5,
        content: '최고',
      },
    };
    summaries.forRestaurants.mockResolvedValue(new Map([['a', summaryA]]));

    const res = await request(server)
      .get('/restaurants')
      .query({ regionCode: '11140' })
      .expect(200);

    expect(summaries.forRestaurants).toHaveBeenCalledWith(['a', 'b']);
    expect(res.body.items[0].reviewSummary).toEqual(summaryA);
    expect(res.body.items[1].reviewSummary).toBeNull();
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
    [{}, 'regionCode·foodId 둘 다 없음'],
    [{ regionCode: '1114' }, '5자리 아님'],
    [{ regionCode: '11140', genre: '한식' }, '43종 밖의 업종'],
    [{ foodId: '3', genre: '카페' }, 'genre와 foodId 동시 사용'],
    [{ foodId: 'abc' }, 'foodId가 숫자 아님'],
    [{ regionCode: '11140', genre: ['카페', '한식'] }, '여러 업종 중 43종 밖'],
    [
      {
        regionCode: '11140',
        genre: ['카페', '분식', '치킨', '피자', '버거', '주점'],
      },
      '업종 6개',
    ],
  ])('입력 오류는 400: %o (%s)', async (query, _reason) => {
    const server = await createApp([]);
    const res = await request(server)
      .get('/restaurants')
      .query(query)
      .expect(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  describe('foodId 검색', () => {
    const bangeo = {
      id: 1,
      name: '방어회',
      searchKeyword: '방어',
      genres: ['일식회집', '스시/초밥'],
      regionCodes: ['50130', '11590'],
    };

    it('지역 미지정이면 첫 추천 지역에서 검색어로 찾고 matchedBy keyword', async () => {
      const server = await createApp([SEOGWIPO]);
      foods.searchInfo.mockResolvedValue(bangeo);
      eatpl.search.mockResolvedValue([
        place('m1', '제주 서귀포시 1'),
        place('x', '대전 중구 1'),
      ]);

      const res = await request(server)
        .get('/restaurants')
        .query({ foodId: '1' })
        .expect(200);

      expect(eatpl.search).toHaveBeenCalledTimes(1);
      expect(eatpl.search).toHaveBeenCalledWith({
        location: '제주 서귀포시',
        merchantName: '방어',
      });
      expect(res.body.food).toEqual({ id: 1, name: '방어회' });
      expect(res.body.matchedBy).toBe('keyword');
      expect(res.body.region.code).toBe('50130');
      expect(res.body.items.map((p: { id: string }) => p.id)).toEqual(['m1']);
    });

    it('검색어 결과가 없으면 업종별로 합쳐 지역 순위순, 중복 제거, matchedBy genre', async () => {
      const server = await createApp([SEOGWIPO]);
      foods.searchInfo.mockResolvedValue(bangeo);
      eatpl.search.mockImplementation(
        async (p: { merchantName?: string; genre?: string }) => {
          if (p.merchantName) return [];
          if (p.genre === '일식회집')
            return [
              place('a', '제주 서귀포시', 0.5),
              place('dup', '제주 서귀포시', 0.2),
            ];
          return [
            place('dup', '제주 서귀포시', 0.2),
            place('b', '제주 서귀포시', null),
            place('c', '제주 서귀포시', 0.1),
          ];
        },
      );

      const res = await request(server)
        .get('/restaurants')
        .query({ foodId: '1', regionCode: '50130' })
        .expect(200);

      expect(eatpl.search).toHaveBeenCalledTimes(3); // 검색어 1 + 업종 2
      expect(res.body.matchedBy).toBe('genre');
      expect(res.body.items.map((p: { id: string }) => p.id)).toEqual([
        'c',
        'dup',
        'a',
        'b',
      ]);
    });

    it('추천 지역이 없는 음식을 지역 없이 찾으면 400', async () => {
      const server = await createApp([]);
      foods.searchInfo.mockResolvedValue({ ...bangeo, regionCodes: [] });
      const res = await request(server)
        .get('/restaurants')
        .query({ foodId: '1' })
        .expect(400);
      expect(res.body.error.message).toContain('지역을 선택');
      expect(eatpl.search).not.toHaveBeenCalled();
    });

    it('사용자가 고른 지역이 있으면 그 지역에서 찾는다', async () => {
      const server = await createApp([SEOUL_JUNG, SEOGWIPO]);
      foods.searchInfo.mockResolvedValue(bangeo);
      eatpl.search.mockResolvedValue([place('s1', '서울 중구 1')]);
      const res = await request(server)
        .get('/restaurants')
        .query({ foodId: '1', regionCode: '11140' })
        .expect(200);
      expect(eatpl.search).toHaveBeenCalledWith({
        location: '서울 중구',
        merchantName: '방어',
      });
      expect(res.body.region.code).toBe('11140');
    });
  });
});
