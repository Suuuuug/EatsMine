import { Controller, Get, Param, Query } from '@nestjs/common';
import { z } from 'zod';
import { FoodsService } from './foods.service.js';

const listQuerySchema = z.object({
  month: z.coerce
    .number({ error: '월은 1~12 숫자예요' })
    .int()
    .min(1, '월은 1~12 숫자예요')
    .max(12, '월은 1~12 숫자예요')
    .optional(),
  q: z
    .string()
    .trim()
    .min(1)
    .max(20, '검색어는 20자 이하로 입력해 주세요')
    .optional(),
});

const idSchema = z.coerce
  .number({ error: '음식 ID는 숫자예요' })
  .int()
  .positive('음식 ID는 숫자예요');

@Controller('foods')
export class FoodsController {
  constructor(private readonly foodsService: FoodsService) {}

  /** GET /foods?month=11&q=굴 — 도감 목록 */
  @Get()
  async list(
    @Query({ schema: listQuerySchema }) query: z.infer<typeof listQuerySchema>,
  ) {
    return { items: await this.foodsService.list(query) };
  }

  /** GET /foods/:id — 음식 상세 (제철 월·추천 지역·업종) */
  @Get(':id')
  detail(@Param('id', { schema: idSchema }) id: number) {
    return this.foodsService.detail(id);
  }
}
