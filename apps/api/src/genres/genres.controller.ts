import { Controller, Get } from '@nestjs/common';
import { MAJOR_GENRES, MINOR_GENRES } from '../eatpl/genres.js';

@Controller('genres')
export class GenresController {
  /** GET /genres — 잇플 업종 43종 (대분류 9 / 소분류 34) */
  @Get()
  list() {
    return { major: MAJOR_GENRES, minor: MINOR_GENRES };
  }
}
