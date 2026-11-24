import { Module } from '@nestjs/common';
import { TerritoriesController } from './territories.controller.js';
import { TerritoriesService } from './territories.service.js';

@Module({
  controllers: [TerritoriesController],
  providers: [TerritoriesService],
})
export class TerritoriesModule {}
