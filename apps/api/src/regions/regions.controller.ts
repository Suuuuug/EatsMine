import { Controller, Get, Query } from '@nestjs/common';
import { z } from 'zod';
import { RegionsService } from './regions.service.js';

const searchQuerySchema = z.object({
  q: z
    .string({ error: '검색어를 입력해 주세요' })
    .trim()
    .min(1, '검색어를 입력해 주세요')
    .max(20, '검색어는 20자 이하로 입력해 주세요'),
});

@Controller('regions')
export class RegionsController {
  constructor(private readonly regionsService: RegionsService) {}

  /** GET /regions?q=수원 — 시·군·구 자동완성 */
  @Get()
  async search(
    @Query({ schema: searchQuerySchema })
    query: z.infer<typeof searchQuerySchema>,
  ) {
    return { items: await this.regionsService.search(query.q) };
  }

  /** GET /regions/popular — 홈 기본 추천 지역 */
  @Get('popular')
  async popular() {
    return { items: await this.regionsService.popular() };
  }
}
