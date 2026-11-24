import { Controller, Get } from '@nestjs/common';
import {
  TERRITORY_WINDOW_DAYS,
  TerritoriesService,
} from './territories.service.js';

@Controller('territories')
export class TerritoriesController {
  constructor(private readonly territories: TerritoriesService) {}

  /** GET /territories — 공유 영토: 지역별 주인 닉네임·리뷰 수 (로그인 불필요, 주인 있는 지역만) */
  @Get()
  async owners() {
    return {
      windowDays: TERRITORY_WINDOW_DAYS,
      items: await this.territories.owners(),
    };
  }
}
