import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, asc, eq, exists, ilike, sql, type SQL } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { AppException } from '../common/app-exception.js';
import {
  foodGenres,
  foodRegions,
  foods,
  foodSeasons,
  regions,
} from '../db/schema.js';
import { escapeLike } from '../regions/regions.service.js';

export type FoodListItem = {
  id: number;
  name: string;
  description: string;
  imageUrl: string | null;
  months: number[];
};

export type FoodDetail = FoodListItem & {
  sourceUrl: string | null;
  regions: { code: string; fullName: string; reason: string }[];
  genres: string[];
};

/** 음식 기반 매장 검색에 필요한 정보 (내부용) */
export type FoodSearchInfo = {
  id: number;
  name: string;
  searchKeyword: string | null;
  genres: string[];
  /** 추천 지역 코드 (foods.json 순서) */
  regionCodes: string[];
};

const monthsOf = sql<number[]>`coalesce(
  (select array_agg(${foodSeasons.month} order by ${foodSeasons.month}) from ${foodSeasons} where ${foodSeasons.foodId} = ${foods.id}),
  '{}'
)`;

@Injectable()
export class FoodsService {
  constructor(@InjectDrizzle() private readonly db: NodePgDatabase) {}

  /**
   * 도감 목록. month: 그 달이 제철인 음식만, q: 이름 부분 일치,
   * genre: 그 업종에 연결된 음식만 (리뷰 작성 시 매장 업종에 맞는 음식 후보, D8)
   */
  async list(filter: {
    month?: number;
    q?: string;
    genre?: string;
  }): Promise<FoodListItem[]> {
    const conditions: SQL[] = [];
    if (filter.genre) {
      conditions.push(
        exists(
          this.db
            .select({ one: sql`1` })
            .from(foodGenres)
            .where(
              and(
                eq(foodGenres.foodId, foods.id),
                eq(foodGenres.genre, filter.genre),
              ),
            ),
        ),
      );
    }
    if (filter.month) {
      conditions.push(
        exists(
          this.db
            .select({ one: sql`1` })
            .from(foodSeasons)
            .where(
              and(
                eq(foodSeasons.foodId, foods.id),
                eq(foodSeasons.month, filter.month),
              ),
            ),
        ),
      );
    }
    if (filter.q)
      conditions.push(ilike(foods.name, `%${escapeLike(filter.q)}%`));

    return this.db
      .select({
        id: foods.id,
        name: foods.name,
        description: foods.description,
        imageUrl: foods.imageUrl,
        months: monthsOf,
      })
      .from(foods)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(foods.id));
  }

  async detail(id: number): Promise<FoodDetail> {
    const [food] = await this.db
      .select({
        id: foods.id,
        name: foods.name,
        description: foods.description,
        imageUrl: foods.imageUrl,
        sourceUrl: foods.sourceUrl,
        months: monthsOf,
      })
      .from(foods)
      .where(eq(foods.id, id))
      .limit(1);
    if (!food) throw notFound();

    const [regionRows, genreRows] = await Promise.all([
      this.db
        .select({
          code: regions.code,
          fullName: regions.fullName,
          reason: foodRegions.reason,
        })
        .from(foodRegions)
        .innerJoin(regions, eq(regions.code, foodRegions.regionCode))
        .where(eq(foodRegions.foodId, id))
        .orderBy(asc(foodRegions.position)),
      this.db
        .select({ genre: foodGenres.genre })
        .from(foodGenres)
        .where(eq(foodGenres.foodId, id)),
    ]);
    return {
      ...food,
      regions: regionRows,
      genres: genreRows.map((g) => g.genre),
    };
  }

  async searchInfo(id: number): Promise<FoodSearchInfo> {
    const [food] = await this.db
      .select({
        id: foods.id,
        name: foods.name,
        searchKeyword: foods.searchKeyword,
      })
      .from(foods)
      .where(eq(foods.id, id))
      .limit(1);
    if (!food) throw notFound();

    const [regionRows, genreRows] = await Promise.all([
      this.db
        .select({ code: foodRegions.regionCode })
        .from(foodRegions)
        .where(eq(foodRegions.foodId, id))
        .orderBy(asc(foodRegions.position)),
      this.db
        .select({ genre: foodGenres.genre })
        .from(foodGenres)
        .where(eq(foodGenres.foodId, id)),
    ]);
    return {
      ...food,
      regionCodes: regionRows.map((r) => r.code),
      genres: genreRows.map((g) => g.genre),
    };
  }
}

function notFound() {
  return new AppException(
    'NOT_FOUND',
    '존재하지 않는 음식이에요.',
    HttpStatus.NOT_FOUND,
  );
}
