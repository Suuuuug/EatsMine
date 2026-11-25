import { Controller, Get, Param } from '@nestjs/common';
import { z } from 'zod';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator.js';
import { ReviewsService } from './reviews.service.js';

/** 매장 ID = merUrl 끝 고유값 (merchantIdFromUrl과 같은 문자 규칙) */
const restaurantIdSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{1,100}$/, '매장 ID 형식이 올바르지 않아요');

@Controller('restaurants/:id/reviews')
export class RestaurantReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  /** GET /restaurants/:id/reviews — 매장 공개 후기 목록·평균 (로그인 불필요). IP당 1분 60회 */
  @Get()
  @RateLimit(60, 60_000)
  list(@Param('id', { schema: restaurantIdSchema }) id: string) {
    return this.reviewsService.listPublicForRestaurant(id);
  }
}
