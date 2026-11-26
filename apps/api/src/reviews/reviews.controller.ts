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
import {
  MAX_PHOTO_BYTES,
  PHOTO_CONTENT_TYPES,
  type PhotoContentType,
} from './photo-storage.js';
import { MAX_REVIEW_PHOTOS, ReviewsService } from './reviews.service.js';

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
/** POST /reviews/photos/uploads로 받은 경로(최대 4장, 순서대로). 본인 폴더·실제 업로드 여부는 서비스에서 확인 */
const photoPathsSchema = z
  .array(z.string({ error: '사진 경로는 문자열이에요' }).max(200), {
    error: '사진은 경로 목록으로 보내 주세요',
  })
  .max(MAX_REVIEW_PHOTOS, `사진은 ${MAX_REVIEW_PHOTOS}장까지 올릴 수 있어요`);

const uploadSchema = z.object(
  {
    contentType: z.enum(
      Object.keys(PHOTO_CONTENT_TYPES) as [
        PhotoContentType,
        ...PhotoContentType[],
      ],
      { error: '사진은 JPG·PNG·WEBP만 올릴 수 있어요' },
    ),
    size: z
      .number({ error: '파일 크기(바이트)가 필요해요' })
      .int()
      .positive()
      .max(MAX_PHOTO_BYTES, '사진은 5MB 이하만 올릴 수 있어요'),
  },
  { error: '본문은 JSON 객체여야 해요' },
);

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
    /** 기본 공개 — 공개 후기만 영토 주인·지역 순위·매장 후기에 반영된다. 나만 보기는 작성 시 직접 고른다 */
    visibility: visibilitySchema.default('public'),
    photoPaths: photoPathsSchema.optional(),
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
      /** 보내면 사진 목록을 통째로 바꾼다(빈 배열이면 모두 삭제). 빠진 사진은 저장소에서도 지운다 */
      photoPaths: photoPathsSchema.optional(),
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

  /**
   * POST /reviews/photos/uploads { contentType, size } — 리뷰 사진 업로드용 서명 URL.
   * 브라우저가 uploadUrl로 파일을 PUT(Content-Type 그대로)한 뒤, path를 리뷰 작성·수정의 photoPaths에 넣는다.
   */
  @Post('photos/uploads')
  @RateLimit(20, 60_000)
  createPhotoUpload(
    @CurrentUser() user: AuthUser,
    @Body({ schema: uploadSchema }) body: z.infer<typeof uploadSchema>,
  ) {
    return this.reviewsService.createPhotoUpload(user, body.contentType);
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
