import { StandardSchemaValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { HttpExceptionFilter } from '../common/http-exception.filter.js';
import { AppThrottlerGuard } from '../common/rate-limit/app-throttler.guard.js';
import { EventsController } from './events.controller.js';
import { EventsService } from './events.service.js';

const valid = {
  restaurantKey: 'bQSyX0QU5duyTaDXVqWW5A',
  regionCode: '11140',
  placement: 'list',
  sourceChannel: 'Instagram',
  sessionKey: 'k3Xz9aQ2mPabcd',
};

describe('POST /events/outbound', () => {
  let app: NestExpressApplication;
  const service = { recordOutbound: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [EventsController],
      providers: [{ provide: EventsService, useValue: service }],
    })
      .overrideGuard(AppThrottlerGuard) // rate limit은 rate-limit.spec에서 검증
      .useValue({ canActivate: () => true })
      .compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    app.useBodyParser('text', { type: 'text/plain', limit: '2kb' }); // main.ts와 동일
    app.useGlobalPipes(new StandardSchemaValidationPipe());
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('JSON 본문을 받아 기록하고 204', async () => {
    await request(app.getHttpServer())
      .post('/events/outbound')
      .send(valid)
      .expect(204);
    expect(service.recordOutbound).toHaveBeenCalledWith({
      ...valid,
      sourceChannel: 'instagram',
    });
  });

  it('sendBeacon처럼 text/plain JSON 문자열도 받는다', async () => {
    await request(app.getHttpServer())
      .post('/events/outbound')
      .set('content-type', 'text/plain;charset=UTF-8')
      .send(
        JSON.stringify({
          restaurantKey: 'abc_123',
          placement: 'map',
          sessionKey: 'session-0001',
        }),
      )
      .expect(204);
    expect(service.recordOutbound).toHaveBeenCalledWith({
      restaurantKey: 'abc_123',
      placement: 'map',
      sessionKey: 'session-0001',
    });
  });

  it('JSON이 아닌 문자열은 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/events/outbound')
      .set('content-type', 'text/plain')
      .send('not json')
      .expect(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
    expect(service.recordOutbound).not.toHaveBeenCalled();
  });

  it.each([
    [{ ...valid, placement: 'popup' }, '허용되지 않은 위치'],
    [{ ...valid, restaurantKey: '../etc' }, '매장 키 형식'],
    [{ ...valid, regionCode: '11' }, '지역 코드 형식'],
    [{ ...valid, sessionKey: 'short' }, '세션 키 길이'],
    [{ ...valid, sourceChannel: 'a b' }, '채널 형식'],
  ])('입력 오류는 400: %o (%s)', async (body, _reason) => {
    await request(app.getHttpServer())
      .post('/events/outbound')
      .send(body)
      .expect(400);
    expect(service.recordOutbound).not.toHaveBeenCalled();
  });
});
