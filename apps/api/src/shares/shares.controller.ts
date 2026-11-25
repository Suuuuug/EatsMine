import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { z } from 'zod';
import type { AuthUser } from '../auth/auth-user.js';
import { Auth, CurrentUser } from '../auth/auth.decorators.js';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator.js';
import { SHARE_TYPES, SharesService } from './shares.service.js';

const typeSchema = z.enum(SHARE_TYPES, {
  error: '공유 종류는 territory 또는 collection이에요',
});
const createSchema = z.object(
  { type: typeSchema },
  { error: '본문은 JSON 객체여야 해요' },
);
const shareIdSchema = z
  .string()
  .regex(/^[A-Za-z0-9]{10}$/, '공유 링크 형식이 올바르지 않아요');

/** 내 공유 링크 관리 (로그인 필요) */
@Controller('me/shares')
@Auth()
export class MeSharesController {
  constructor(private readonly shares: SharesService) {}

  /** GET /me/shares — 영토·도감 공유가 켜져 있는지 (링크 있으면 { id, type, createdAt }, 없으면 null) */
  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.shares.listMine(user.id);
  }

  /** POST /me/shares { type } — 공유 링크 만들기 (있으면 같은 링크). 프론트는 /share/{id} 주소를 만든다 */
  @Post()
  @RateLimit(10, 60_000)
  create(
    @CurrentUser() user: AuthUser,
    @Body({ schema: createSchema }) body: z.infer<typeof createSchema>,
  ) {
    return this.shares.create(user, body.type);
  }

  /** DELETE /me/shares/:type — 공유 취소 (링크 무효) */
  @Delete(':type')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('type', { schema: typeSchema }) type: z.infer<typeof typeSchema>,
  ) {
    await this.shares.remove(user.id, type);
  }
}

/** 공유 화면 데이터 (로그인 불필요, 실시간) */
@Controller('shares')
export class SharesController {
  constructor(private readonly shares: SharesService) {}

  /** GET /shares/:id — 링크 무작위 대입 방지: IP당 1분 60회 */
  @Get(':id')
  @RateLimit(60, 60_000)
  view(@Param('id', { schema: shareIdSchema }) id: string) {
    return this.shares.view(id);
  }
}
