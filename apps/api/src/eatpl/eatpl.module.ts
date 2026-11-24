import { Module } from '@nestjs/common';
import { EatplClient } from './eatpl.client.js';

@Module({
  providers: [EatplClient],
  exports: [EatplClient],
})
export class EatplModule {}
