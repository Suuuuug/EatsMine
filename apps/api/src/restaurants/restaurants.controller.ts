import { Controller, Get, Query } from '@nestjs/common';
import { z } from 'zod';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator.js';
import { MAJOR_GENRES, MINOR_GENRES } from '../eatpl/genres.js';
import { RestaurantsService } from './restaurants.service.js';

const searchQuerySchema = z
  .object({
    regionCode: z
      .string()
      .regex(/^\d{5}$/, '지역 코드는 5자리 숫자예요')
      .optional(),
    genre: z
      .enum([...MAJOR_GENRES, ...MINOR_GENRES], {
        error: '지원하지 않는 업종이에요',
      })
      .optional(),
    foodId: z.coerce
      .number({ error: '음식 ID는 숫자예요' })
      .int()
      .positive('음식 ID는 숫자예요')
      .optional(),
  })
  .refine((q) => q.regionCode || q.foodId, {
    message: '지역(regionCode)이나 음식(foodId)을 선택해 주세요',
  })
  .refine((q) => !(q.genre && q.foodId), {
    message: '업종(genre)과 음식(foodId)은 함께 쓸 수 없어요',
  });

@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  /**
   * GET /restaurants?regionCode=41110&genre=고기구이 — 지역(+업종) 잇플 매장 검색
   * GET /restaurants?foodId=3[&regionCode=…]       — 음식 기반 검색 (matchedBy 포함)
   * 외부 프록시 보호: IP당 1분 30회
   */
  @Get()
  @RateLimit(30, 60_000)
  search(
    @Query({ schema: searchQuerySchema })
    query: z.infer<typeof searchQuerySchema>,
  ) {
    if (query.foodId)
      return this.restaurantsService.searchByFood(
        query.foodId,
        query.regionCode,
      );
    return this.restaurantsService.search(query.regionCode!, query.genre);
  }
}
