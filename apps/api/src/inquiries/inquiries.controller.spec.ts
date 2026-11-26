import {
  HttpStatus,
  type INestApplication,
  StandardSchemaValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { OptionalAuthGuard } from '../auth/auth.guard.js';
import { AppException } from '../common/app-exception.js';
import { HttpExceptionFilter } from '../common/http-exception.filter.js';
import { RateLimitGuard } from '../common/rate-limit/rate-limit.guard.js';
import { InquiriesController } from './inquiries.controller.js';
import { InquiriesService } from './inquiries.service.js';

const user = {
  id: '6f1c2a3e-1111-4222-8333-944455556666',
  email: 'member@example.com',
};

const valid = {
  type: 'error',
  email: ' user@example.com ',
  content: '  도감에서 특정 지역 식당이 열리지 않아요. 확인 부탁드려요!  ',
};

describe('POST /inquiries', () => {
  let app: INestApplication;
  const service = { send: vi.fn() };
  let optionalLoggedIn = false;

  beforeEach(async () => {
    vi.clearAllMocks();
    optionalLoggedIn = false;
    const moduleRef = await Test.createTestingModule({
      controllers: [InquiriesController],
      providers: [{ provide: InquiriesService, useValue: service }],
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

  it('비로그인 문의를 검증·정리해 전달하고 201을 돌려준다', async () => {
    service.send.mockResolvedValue({ ok: true });
    const res = await request(app.getHttpServer())
      .post('/inquiries')
      .send(valid)
      .expect(201);

    expect(res.body).toEqual({ ok: true });
    expect(service.send).toHaveBeenCalledWith(
      {
        type: 'error',
        email: 'user@example.com',
        content: '도감에서 특정 지역 식당이 열리지 않아요. 확인 부탁드려요!',
      },
      null,
    );
  });

  it('로그인 사용자가 보내면 user 정보를 함께 넘긴다', async () => {
    optionalLoggedIn = true;
    service.send.mockResolvedValue({ ok: true });
    await request(app.getHttpServer())
      .post('/inquiries')
      .send({ type: 'service', email: 'a@b.co', content: '가'.repeat(10) })
      .expect(201);

    expect(service.send).toHaveBeenCalledWith(
      { type: 'service', email: 'a@b.co', content: '가'.repeat(10) },
      user,
    );
  });

  it('메일 설정이 없으면 503 SERVICE_MISCONFIGURED', async () => {
    service.send.mockRejectedValue(
      new AppException(
        'SERVICE_MISCONFIGURED',
        '문의 창구를 아직 열지 못했어요. 잠시 후 다시 시도해 주세요.',
        HttpStatus.SERVICE_UNAVAILABLE,
      ),
    );
    const res = await request(app.getHttpServer())
      .post('/inquiries')
      .send(valid)
      .expect(503);

    expect(res.body.error.code).toBe('SERVICE_MISCONFIGURED');
  });

  it.each([
    [{ ...valid, type: 'billing' }, '지원하지 않는 문의 종류'],
    [{ ...valid, email: '' }, '빈 이메일'],
    [{ ...valid, email: 'not-an-email' }, '이메일 형식 오류'],
    [{ ...valid, email: 'a@b.co\r\nBcc:evil@x.com' }, '헤더 개행 주입'],
    [{ ...valid, content: '짧은글' }, '10자 미만'],
    [{ ...valid, content: ' '.repeat(20) }, '공백만 20자'],
    [{ ...valid, content: '가'.repeat(1001) }, '1000자 초과'],
  ])('입력 오류는 400: %o (%s)', async (body, _reason) => {
    const res = await request(app.getHttpServer())
      .post('/inquiries')
      .send(body)
      .expect(400);

    expect(res.body.error.code).toBe('BAD_REQUEST');
    expect(service.send).not.toHaveBeenCalled();
  });
});
