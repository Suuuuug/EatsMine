import { Module } from '@nestjs/common';
import { EatplModule } from '../eatpl/eatpl.module.js';
import { ProfilesModule } from '../profiles/profiles.module.js';
import { RegionsModule } from '../regions/regions.module.js';
import { MeRecordsController } from './me-records.controller.js';
import { MeRecordsService } from './me-records.service.js';
import { ReviewsController } from './reviews.controller.js';
import { ReviewsService } from './reviews.service.js';

@Module({
  imports: [EatplModule, RegionsModule, ProfilesModule],
  controllers: [ReviewsController, MeRecordsController],
  providers: [ReviewsService, MeRecordsService],
})
export class ReviewsModule {}
