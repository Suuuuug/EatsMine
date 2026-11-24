import { Module } from '@nestjs/common';
import { AddressMatcher } from './address-matcher.js';
import { RegionsController } from './regions.controller.js';
import { RegionsService } from './regions.service.js';

@Module({
  controllers: [RegionsController],
  providers: [RegionsService, AddressMatcher],
  exports: [RegionsService, AddressMatcher],
})
export class RegionsModule {}
