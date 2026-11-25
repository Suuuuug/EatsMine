import { Controller, Get, Param } from '@nestjs/common';
import { z } from 'zod';
import type { AuthUser } from '../auth/auth-user.js';
import { OptionalAuth, OptionalUser } from '../auth/auth.decorators.js';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator.js';
import {
  TERRITORY_WINDOW_DAYS,
  TerritoriesService,
} from './territories.service.js';

const regionCodeSchema = z
  .string()
  .regex(/^\d{5}$/, '지역 코드는 5자리 숫자예요');

@Controller('territories')
export class TerritoriesController {
  constructor(private readonly territories: TerritoriesService) {}

  /** GET /territories — 공유 영토: 지역별 주인 닉네임·리뷰 수 (로그인 불필요, 주인 있는 지역만) */
  @Get()
  async owners() {
    return {
      windowDays: TERRITORY_WINDOW_DAYS,
      items: await this.territories.owners(),
    };
  }

  /** GET /territories/:regionCode/ranking — 지역 안 사용자 순위 상위 10명 (+ 로그인 시 내 순위). IP당 1분 60회 */
  @Get(':regionCode/ranking')
  @OptionalAuth()
  @RateLimit(60, 60_000)
  ranking(
    @Param('regionCode', { schema: regionCodeSchema }) regionCode: string,
    @OptionalUser() user: AuthUser | null,
  ) {
    return this.territories.ranking(regionCode, user?.id ?? null);
  }
}
