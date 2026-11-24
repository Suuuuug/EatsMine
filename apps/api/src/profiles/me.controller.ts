import { Body, Controller, Get, Patch } from '@nestjs/common';
import { z } from 'zod';
import type { AuthUser } from '../auth/auth-user.js';
import { Auth, CurrentUser } from '../auth/auth.decorators.js';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator.js';
import { ProfilesService, toProfileDto } from './profiles.service.js';

const updateMeSchema = z.object(
  {
    nickname: z
      .string({ error: '닉네임을 입력해 주세요' })
      .trim()
      .transform((v) => v.replace(/\s+/g, ' '))
      .pipe(
        z
          .string()
          .min(2, '닉네임은 2자 이상이에요')
          .max(12, '닉네임은 12자 이하예요')
          .regex(
            /^[가-힣a-zA-Z0-9 ]+$/,
            '닉네임은 한글·영문·숫자·공백만 쓸 수 있어요',
          ),
      ),
  },
  { error: '본문은 JSON 객체여야 해요' },
);

@Controller('me')
@Auth()
export class MeController {
  constructor(private readonly profilesService: ProfilesService) {}

  /** GET /me — 내 프로필 (없으면 생성) */
  @Get()
  async get(@CurrentUser() user: AuthUser) {
    return toProfileDto(await this.profilesService.getOrCreate(user));
  }

  /** PATCH /me — 닉네임 변경 (1분 10회) */
  @Patch()
  @RateLimit(10, 60_000)
  async update(
    @CurrentUser() user: AuthUser,
    @Body({ schema: updateMeSchema }) body: z.infer<typeof updateMeSchema>,
  ) {
    return toProfileDto(
      await this.profilesService.updateNickname(user, body.nickname),
    );
  }
}
