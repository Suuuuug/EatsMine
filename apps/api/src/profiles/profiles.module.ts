import { Module } from '@nestjs/common';
import { MeController } from './me.controller.js';
import { ProfilesService } from './profiles.service.js';

@Module({
  controllers: [MeController],
  providers: [ProfilesService],
  exports: [ProfilesService],
})
export class ProfilesModule {}
