import { Controller, Get, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerStorageService } from '@nestjs/throttler';
import request from 'supertest';
import { HttpExceptionFilter } from '../http-exception.filter.js';
import { DbThrottlerStorage } from './db-throttler.storage.js';
import { RateLimit } from './rate-limit.decorator.js';
import { RateLimitModule } from './rate-limit.module.js';

@Controller()
class TestController {
  @Get('limited')
  @RateLimit(2, 60_000)
  limited() {
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
      // DB 대신 메모리 저장소로 동작만 확인 (DB 저장소 SQL은 마이그레이션 후 실제 DB로 검증)
      .overrideProvider(DbThrottlerStorage)
      .useValue(new ThrottlerStorageService())
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('limit을 넘으면 429와 통일된 에러 형식을 돌려준다', async () => {
    const server = app.getHttpServer();
    await request(server).get('/limited').expect(200);
    await request(server).get('/limited').expect(200);
    const res = await request(server).get('/limited').expect(429);
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
