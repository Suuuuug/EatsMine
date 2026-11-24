import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { z } from 'zod';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator.js';
import { EventsService } from './events.service.js';

const outboundSchema = z.object(
  {
    restaurantKey: z
      .string()
      .regex(/^[A-Za-z0-9_-]{1,64}$/, '매장 키 형식이 올바르지 않아요'),
    regionCode: z
      .string()
      .regex(/^\d{5}$/, '지역 코드는 5자리 숫자예요')
      .optional(),
    placement: z.enum(['list', 'map', 'share']),
    /** UTM·유입 사이트 기반 채널 이름 (예: instagram, kakaotalk) */
    sourceChannel: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9_.-]{1,50}$/, '유입 채널 형식이 올바르지 않아요')
      .optional(),
    sessionKey: z
      .string()
      .regex(/^[A-Za-z0-9_-]{8,64}$/, '세션 키 형식이 올바르지 않아요'),
  },
  { error: '본문은 JSON 객체여야 해요' },
);

/**
 * sendBeacon은 다른 도메인으로 text/plain(JSON 문자열)으로 보내는 게 안정적이라,
 * 문자열 본문이면 JSON으로 풀어서 검증한다. 풀 수 없으면 검증 단계에서 400.
 */
const outboundBodySchema = z.preprocess((value) => {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
}, outboundSchema);

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  /**
   * POST /events/outbound — 잇플 이동 클릭 기록 (D11). 로그인 불필요, IP당 1분 60회.
   * 프론트는 기록 성공 여부와 상관없이 merUrl 링크 이동을 막지 않는다.
   */
  @Post('outbound')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RateLimit(60, 60_000)
  async outbound(
    @Body({ schema: outboundBodySchema })
    body: z.infer<typeof outboundSchema>,
  ): Promise<void> {
    await this.eventsService.recordOutbound(body);
  }
}
