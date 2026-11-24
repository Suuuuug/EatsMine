import { Controller, Get, Query } from '@nestjs/common';
import { z } from 'zod';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator.js';
import { MAJOR_GENRES, MINOR_GENRES } from '../eatpl/genres.js';
import { RestaurantsService } from './restaurants.service.js';

const searchQuerySchema = z.object({
  regionCode: z
    .string({ error: '지역(regionCode)을 선택해 주세요' })
    .regex(/^\d{5}$/, '지역 코드는 5자리 숫자예요'),
  genre: z
    .enum([...MAJOR_GENRES, ...MINOR_GENRES], {
      error: '지원하지 않는 업종이에요',
    })
    .optional(),
});

@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  /** GET /restaurants?regionCode=41110&genre=고기구이 — 잇플 매장 검색 (외부 프록시 보호: IP당 1분 30회) */
  @Get()
  @RateLimit(30, 60_000)
  search(
    @Query({ schema: searchQuerySchema })
    query: z.infer<typeof searchQuerySchema>,
  ) {
    return this.restaurantsService.search(query.regionCode, query.genre);
  }
}
