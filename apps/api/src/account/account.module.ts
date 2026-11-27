import { Module } from '@nestjs/common';
import { ReviewsModule } from '../reviews/reviews.module.js';
import { AccountController } from './account.controller.js';
import { AccountService } from './account.service.js';

/** 회원 탈퇴 (DELETE /me) */
@Module({
  imports: [ReviewsModule],
  controllers: [AccountController],
  providers: [AccountService],
})
export class AccountModule {}
