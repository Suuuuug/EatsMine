import {
  BadRequestException,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { AppException } from './app-exception.js';
import { toErrorResponse } from './http-exception.filter.js';

describe('toErrorResponse', () => {
  it('AppException은 지정한 코드·메시지·상태를 그대로 쓴다', () => {
    const res = toErrorResponse(
      new AppException(
        'EATPL_UNAVAILABLE',
        '잇플 응답 없음',
        HttpStatus.BAD_GATEWAY,
      ),
    );
    expect(res).toEqual({
      status: 502,
      body: { error: { code: 'EATPL_UNAVAILABLE', message: '잇플 응답 없음' } },
    });
  });

  it('검증 실패(메시지 배열)는 BAD_REQUEST로 메시지를 합친다', () => {
    const res = toErrorResponse(
      new BadRequestException(['q: 필수', 'month: 1~12']),
    );
    expect(res).toEqual({
      status: 400,
      body: { error: { code: 'BAD_REQUEST', message: 'q: 필수, month: 1~12' } },
    });
  });

  it('상태 코드에 맞는 에러 코드를 붙인다', () => {
    expect(
      toErrorResponse(new NotFoundException('없는 음식')).body.error,
    ).toEqual({
      code: 'NOT_FOUND',
      message: '없는 음식',
    });
  });

  it('429는 RATE_LIMITED와 안내 문구', () => {
    const res = toErrorResponse(
      new HttpException('Too Many Requests', HttpStatus.TOO_MANY_REQUESTS),
    );
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
    expect(res.body.error.message).toContain('잠시 후');
  });

  it('알 수 없는 에러는 내부 내용을 숨기고 500 INTERNAL_ERROR', () => {
    const res = toErrorResponse(
      new Error('connection string leaked: postgres://secret'),
    );
    expect(res).toEqual({
      status: 500,
      body: {
        error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했어요.' },
      },
    });
  });
});
