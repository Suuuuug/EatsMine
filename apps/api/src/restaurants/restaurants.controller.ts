import { Controller, Get, Query } from '@nestjs/common';
import { z } from 'zod';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator.js';
import { MAJOR_GENRES, MINOR_GENRES } from '../eatpl/genres.js';
import { RestaurantsService } from './restaurants.service.js';

/** 한 번에 고를 수 있는 업종 수 — 업종마다 잇플을 따로 조회하므로 외부 프록시 부하를 제한 */
export const MAX_GENRES = 5;

const genreSchema = z.enum([...MAJOR_GENRES, ...MINOR_GENRES], {
  error: '지원하지 않는 업종이에요',
});

const searchQuerySchema = z
  .object({
    regionCode: z
      .string()
      .regex(/^\d{5}$/, '지역 코드는 5자리 숫자예요')
      .optional(),
    /** ?genre=카페 또는 ?genre=카페&genre=분식 (최대 MAX_GENRES개, 중복 제거) */
    genre: z
      .preprocess(
        (v) => (v === undefined || Array.isArray(v) ? v : [v]),
        z
          .array(genreSchema)
          .transform((v) => [...new Set(v)])
          .refine(
            (v) => v.length <= MAX_GENRES,
            `업종은 ${MAX_GENRES}개까지 고를 수 있어요`,
          ),
      )
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
   * GET /restaurants?regionCode=41110&genre=고기구이[&genre=카페] — 지역(+업종 최대 5개) 잇플 매장 검색
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
    return this.restaurantsService.search(query.regionCode!, query.genre ?? []);
  }
}
