import { Module } from '@nestjs/common';
import { EatplModule } from '../eatpl/eatpl.module.js';
import { RegionsModule } from '../regions/regions.module.js';
import { RestaurantsController } from './restaurants.controller.js';
import { RestaurantsService } from './restaurants.service.js';

@Module({
  imports: [EatplModule, RegionsModule],
  controllers: [RestaurantsController],
  providers: [RestaurantsService],
})
export class RestaurantsModule {}
