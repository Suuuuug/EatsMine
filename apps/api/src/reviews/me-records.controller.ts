import { Controller, Get } from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user.js';
import { Auth, CurrentUser } from '../auth/auth.decorators.js';
import { MeRecordsService } from './me-records.service.js';
import { ReviewsService } from './reviews.service.js';

/** 내 기록 (로그인 필요). 프로필(GET/PATCH /me)은 MeController */
@Controller('me')
@Auth()
export class MeRecordsController {
  constructor(
    private readonly reviewsService: ReviewsService,
    private readonly records: MeRecordsService,
  ) {}

  /** GET /me/reviews — 내 리뷰 (최신순, 최대 200개) */
  @Get('reviews')
  async reviews(@CurrentUser() user: AuthUser) {
    return { items: await this.reviewsService.listMine(user.id) };
  }

  /** GET /me/territories — 내 영토 { count, total, items } */
  @Get('territories')
  territories(@CurrentUser() user: AuthUser) {
    return this.records.territories(user.id);
  }

  /** GET /me/collection — 내 도감 { count, total, items } */
  @Get('collection')
  collection(@CurrentUser() user: AuthUser) {
    return this.records.collection(user.id);
  }
}
