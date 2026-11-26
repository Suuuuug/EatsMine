import { Controller, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user.js';
import { Auth, CurrentUser } from '../auth/auth.decorators.js';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator.js';
import { AccountService } from './account.service.js';

@Controller('me')
@Auth()
export class AccountController {
  constructor(private readonly account: AccountService) {}

  /**
   * DELETE /me — 회원 탈퇴. 계정과 내 기록(리뷰·사진·영토·도감·공유 링크)을 모두 지우고 되돌릴 수 없다.
   * 확인 절차는 화면에서 한다. 성공하면 204, 프론트는 받은 뒤 로그아웃한다.
   */
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @RateLimit(5, 60_000)
  async remove(@CurrentUser() user: AuthUser): Promise<void> {
    await this.account.deleteAccount(user);
  }
}
