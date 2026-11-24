import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { AppException } from '../common/app-exception.js';
import { regions } from '../db/schema.js';
import { EatplClient } from '../eatpl/eatpl.client.js';
import { EATPL_ATTRIBUTION, type EatplPlace } from '../eatpl/eatpl.types.js';
import { AddressMatcher } from '../regions/address-matcher.js';

export type RestaurantSearchResult = {
  region: { code: string; fullName: string };
  items: EatplPlace[];
  source: string;
  fetchedAt: string;
};

@Injectable()
export class RestaurantsService {
  constructor(
    @InjectDrizzle() private readonly db: NodePgDatabase,
    private readonly eatpl: EatplClient,
    private readonly addressMatcher: AddressMatcher,
  ) {}

  /**
   * 지역(+업종) 잇플 검색 (D3, D4).
   * 잇플 주소 검색은 다른 지역이 섞일 수 있어(예: "서울 중구" → "대전 중구") 결과 주소로 다시 걸러낸다.
   */
  async search(
    regionCode: string,
    genre?: string,
  ): Promise<RestaurantSearchResult> {
    const [region] = await this.db
      .select({
        code: regions.code,
        fullName: regions.fullName,
        eatplQuery: regions.eatplQuery,
      })
      .from(regions)
      .where(and(eq(regions.code, regionCode), eq(regions.level, 'sigungu')))
      .limit(1);
    if (!region?.eatplQuery) {
      throw new AppException(
        'NOT_FOUND',
        '존재하지 않는 지역이에요.',
        HttpStatus.NOT_FOUND,
      );
    }

    const places = await this.eatpl.search({
      location: region.eatplQuery,
      genre,
    });
    const matched = await Promise.all(
      places.map((p) => this.addressMatcher.match(p.address)),
    );

    return {
      region: { code: region.code, fullName: region.fullName },
      items: places.filter((_, i) => matched[i] === region.code),
      source: EATPL_ATTRIBUTION,
      fetchedAt: new Date().toISOString(),
    };
  }
}
