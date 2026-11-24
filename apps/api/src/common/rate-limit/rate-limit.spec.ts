import { Controller, Get, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { HttpExceptionFilter } from '../http-exception.filter.js';
import { RateLimit } from './rate-limit.decorator.js';
import { clientIp } from './rate-limit.guard.js';
import { RateLimitModule } from './rate-limit.module.js';
import { MemoryRateLimitStorage, RateLimitStorage } from './rate-limit.storage.js';

@Controller()
class TestController {
  @Get('limited')
  @RateLimit(2, 60_000)
  limited() {
    return { ok: true };
  }

  @Get('other')
  @RateLimit(2, 60_000)
  other() {
    return { ok: true };
  }

  @Get('free')
  free() {
    return { ok: true };
  }
}

describe('RateLimit', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [RateLimitModule],
      controllers: [TestController],
    })
      // DB 대신 메모리 저장소로 Guard 동작만 확인 (DB 저장소 SQL은 실제 DB로 검증함)
      .overrideProvider(RateLimitStorage)
      .useValue(new MemoryRateLimitStorage())
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('limit을 넘으면 429, Retry-After, 통일된 에러 형식', async () => {
    const server = app.getHttpServer();
    await request(server).get('/limited').expect(200);
    await request(server).get('/limited').expect(200);
    const res = await request(server).get('/limited').expect(429);
    expect(res.headers['retry-after']).toBe('60');
    expect(res.body).toEqual({
      error: {
        code: 'RATE_LIMITED',
        message: '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.',
      },
    });
  });

  it('@RateLimit이 없는 라우트는 제한하지 않는다', async () => {
    const server = app.getHttpServer();
    for (let i = 0; i < 5; i++) await request(server).get('/free').expect(200);
  });

  it('라우트마다 따로 센다', async () => {
    const server = app.getHttpServer();
    for (let i = 0; i < 2; i++) await request(server).get('/limited').expect(200);
    await request(server).get('/limited').expect(429);
    await request(server).get('/other').expect(200);
  });

  it('x-vercel-forwarded-for 기준으로 사용자(IP)를 구분한다', async () => {
    const server = app.getHttpServer();
    for (let i = 0; i < 2; i++)
      await request(server)
        .get('/limited')
        .set('x-vercel-forwarded-for', '1.1.1.1')
        .expect(200);
    await request(server)
      .get('/limited')
      .set('x-vercel-forwarded-for', '1.1.1.1')
      .expect(429);
    await request(server)
      .get('/limited')
      .set('x-vercel-forwarded-for', '2.2.2.2')
      .expect(200);
  });
});

describe('clientIp', () => {
  it('Vercel 헤더 → x-real-ip → req.ip 순', () => {
    expect(clientIp({ headers: { 'x-vercel-forwarded-for': '1.1.1.1, 9.9.9.9', 'x-real-ip': '2.2.2.2' }, ip: '3.3.3.3' })).toBe(
      '1.1.1.1',
    );
    expect(clientIp({ headers: { 'x-real-ip': '2.2.2.2' }, ip: '3.3.3.3' })).toBe('2.2.2.2');
    expect(clientIp({ headers: {}, ip: '3.3.3.3' })).toBe('3.3.3.3');
    expect(clientIp({ headers: {}, ip: undefined })).toBe('unknown');
  });
});

describe('MemoryRateLimitStorage', () => {
  it('limit 초과 시 차단, 차단 시간이 지나면 새 윈도우', async () => {
    vi.useFakeTimers();
    const s = new MemoryRateLimitStorage();
    expect((await s.increment('k', 1000, 2, 3000)).isBlocked).toBe(false);
    expect((await s.increment('k', 1000, 2, 3000)).isBlocked).toBe(false);
    expect(await s.increment('k', 1000, 2, 3000)).toMatchObject({ totalHits: 3, isBlocked: true, timeToBlockExpire: 3 });
    vi.advanceTimersByTime(3100);
    expect(await s.increment('k', 1000, 2, 3000)).toMatchObject({ totalHits: 1, isBlocked: false });
    vi.useRealTimers();
  });
});
