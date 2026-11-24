import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { AppException } from '../common/app-exception.js';
import { regions } from '../db/schema.js';
import { EatplClient } from '../eatpl/eatpl.client.js';
import {
  EATPL_ATTRIBUTION,
  type EatplPlace,
  type EatplSearchParams,
} from '../eatpl/eatpl.types.js';
import { FoodsService } from '../foods/foods.service.js';
import { AddressMatcher } from '../regions/address-matcher.js';

/**
 * 음식 검색에서 매장을 찾은 방법 (잇플에는 메뉴 정보가 없음)
 * - keyword: 가맹점명에 음식 검색어가 들어간 매장 (예: "OO밀면")
 * - genre:   검색어로 못 찾아 음식과 연결된 업종의 매출 상위 매장으로 대체 (그 메뉴가 있다는 보장 없음)
 */
export type MatchedBy = 'keyword' | 'genre';

export type RestaurantSearchResult = {
  region: { code: string; fullName: string };
  /** foodId로 검색했을 때만 */
  food?: { id: number; name: string };
  matchedBy?: MatchedBy;
  items: EatplPlace[];
  source: string;
  fetchedAt: string;
};

type Region = { code: string; fullName: string; eatplQuery: string };

@Injectable()
export class RestaurantsService {
  constructor(
    @InjectDrizzle() private readonly db: NodePgDatabase,
    private readonly eatpl: EatplClient,
    private readonly addressMatcher: AddressMatcher,
    private readonly foods: FoodsService,
  ) {}

  /** 지역(+업종) 잇플 검색 (D3, D4) */
  async search(
    regionCode: string,
    genre?: string,
  ): Promise<RestaurantSearchResult> {
    const region = await this.findRegion(regionCode);
    const items = await this.searchInRegion(region, { genre });
    return this.result(region, items);
  }

  /**
   * "이 음식 먹으러 가기" (D7)
   * 1) 지역 미지정이면 음식의 첫 추천 지역 (없으면 400)
   * 2) 지역 + 가맹점명 검색어 → 결과가 있으면 matchedBy keyword
   * 3) 없으면 음식 업종별로 조회해 합치고 지역 순위순 → matchedBy genre
   */
  async searchByFood(
    foodId: number,
    regionCode?: string,
  ): Promise<RestaurantSearchResult> {
    const food = await this.foods.searchInfo(foodId);
    const code = regionCode ?? food.regionCodes[0];
    if (!code) {
      throw new AppException(
        'BAD_REQUEST',
        '이 음식은 추천 지역이 없어요. 지역을 선택해 주세요.',
        HttpStatus.BAD_REQUEST,
      );
    }
    const region = await this.findRegion(code);
    const foodRef = { id: food.id, name: food.name };

    if (food.searchKeyword) {
      const byKeyword = await this.searchInRegion(region, {
        merchantName: food.searchKeyword,
      });
      if (byKeyword.length > 0)
        return this.result(region, byKeyword, foodRef, 'keyword');
    }

    const perGenre = await Promise.all(
      food.genres.map((genre) => this.searchInRegion(region, { genre })),
    );
    const merged = new Map<string, EatplPlace>();
    for (const place of perGenre.flat())
      if (!merged.has(place.id)) merged.set(place.id, place);
    const byGenre = [...merged.values()].sort(
      (a, b) =>
        (a.rankLocal ?? Number.POSITIVE_INFINITY) -
        (b.rankLocal ?? Number.POSITIVE_INFINITY),
    );
    return this.result(region, byGenre, foodRef, 'genre');
  }

  private async findRegion(code: string): Promise<Region> {
    const [region] = await this.db
      .select({
        code: regions.code,
        fullName: regions.fullName,
        eatplQuery: regions.eatplQuery,
      })
      .from(regions)
      .where(and(eq(regions.code, code), eq(regions.level, 'sigungu')))
      .limit(1);
    if (!region?.eatplQuery) {
      throw new AppException(
        'NOT_FOUND',
        '존재하지 않는 지역이에요.',
        HttpStatus.NOT_FOUND,
      );
    }
    return { ...region, eatplQuery: region.eatplQuery };
  }

  /** 잇플 주소 검색은 다른 지역이 섞일 수 있어(예: "서울 중구" → "대전 중구") 결과 주소로 다시 걸러낸다. */
  private async searchInRegion(
    region: Region,
    params: Omit<EatplSearchParams, 'location'>,
  ): Promise<EatplPlace[]> {
    const places = await this.eatpl.search({
      location: region.eatplQuery,
      ...params,
    });
    const matched = await Promise.all(
      places.map((p) => this.addressMatcher.match(p.address)),
    );
    return places.filter((_, i) => matched[i] === region.code);
  }

  private result(
    region: Region,
    items: EatplPlace[],
    food?: { id: number; name: string },
    matchedBy?: MatchedBy,
  ): RestaurantSearchResult {
    return {
      region: { code: region.code, fullName: region.fullName },
      ...(food && { food, matchedBy }),
      items,
      source: EATPL_ATTRIBUTION,
      fetchedAt: new Date().toISOString(),
    };
  }
}
