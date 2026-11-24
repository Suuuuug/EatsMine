import { Module } from '@nestjs/common';
import { ProfilesModule } from '../profiles/profiles.module.js';
import { ReviewsModule } from '../reviews/reviews.module.js';
import { MeSharesController, SharesController } from './shares.controller.js';
import { SharesService } from './shares.service.js';

@Module({
  imports: [ProfilesModule, ReviewsModule],
  controllers: [MeSharesController, SharesController],
  providers: [SharesService],
})
export class SharesModule {}
