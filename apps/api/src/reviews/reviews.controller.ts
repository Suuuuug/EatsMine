import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { z } from 'zod';
import type { AuthUser } from '../auth/auth-user.js';
import { Auth, CurrentUser } from '../auth/auth.decorators.js';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator.js';
import { ReviewsService } from './reviews.service.js';

/** YYYY-MM-DD, 오늘(한국 시간) 이후 날짜는 불가 */
const visitedAtSchema = z.iso
  .date({ error: '방문일은 YYYY-MM-DD 형식이에요' })
  .refine((d) => d <= todayKst(), '방문일은 오늘 이후일 수 없어요');

const contentSchema = z
  .string()
  .trim()
  .max(500, '후기는 500자 이하로 써 주세요');
const ratingSchema = z
  .number({ error: '별점은 1~5 숫자예요' })
  .int()
  .min(1)
  .max(5);
const visibilitySchema = z.enum(['private', 'public'], {
  error: '공개 범위는 private 또는 public이에요',
});
const foodIdSchema = z.number({ error: '음식 ID는 숫자예요' }).int().positive();

const createSchema = z.object(
  {
    merUrl: z.string({ error: '잇플 상세 링크(merUrl)가 필요해요' }).max(300),
    restaurantName: z
      .string({ error: '매장 이름이 필요해요' })
      .trim()
      .min(1)
      .max(100),
    rating: ratingSchema,
    /** 빈 문자열은 후기 없음으로 */
    content: contentSchema.optional().transform((v) => v || undefined),
    visitedAt: visitedAtSchema.optional(),
    foodId: foodIdSchema.optional(),
    visibility: visibilitySchema.default('private'),
  },
  { error: '본문은 JSON 객체여야 해요' },
);

const updateSchema = z
  .object(
    {
      rating: ratingSchema.optional(),
      content: contentSchema
        .nullable()
        .optional()
        .transform((v) => (v === '' ? null : v)),
      visitedAt: visitedAtSchema.nullable().optional(),
      foodId: foodIdSchema.nullable().optional(),
      visibility: visibilitySchema.optional(),
    },
    { error: '본문은 JSON 객체여야 해요' },
  )
  .refine(
    (v) => Object.values(v).some((x) => x !== undefined),
    '바꿀 항목을 하나 이상 보내 주세요',
  );

const idSchema = z.coerce
  .number({ error: '리뷰 ID는 숫자예요' })
  .int()
  .positive('리뷰 ID는 숫자예요');

@Controller('reviews')
@Auth()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  /** POST /reviews — 리뷰 작성 + 영토·도감·등급 (D8). 등급 어뷰징 방지: IP당 1분 10회 */
  @Post()
  @RateLimit(10, 60_000)
  create(
    @CurrentUser() user: AuthUser,
    @Body({ schema: createSchema }) body: z.infer<typeof createSchema>,
  ) {
    return this.reviewsService.create(user, body);
  }

  /** PATCH /reviews/:id — 본인 리뷰 수정 */
  @Patch(':id')
  @RateLimit(30, 60_000)
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', { schema: idSchema }) id: number,
    @Body({ schema: updateSchema }) body: z.infer<typeof updateSchema>,
  ) {
    return this.reviewsService.update(user, id, body);
  }

  /** DELETE /reviews/:id — 본인 리뷰 삭제 (영토·도감 회수) */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RateLimit(30, 60_000)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id', { schema: idSchema }) id: number,
  ): Promise<void> {
    await this.reviewsService.remove(user, id);
  }
}

function todayKst(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
