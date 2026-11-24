import { Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { asc, count, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  foods,
  regions,
  userFoodCollection,
  userRegionVisits,
} from '../db/schema.js';

@Injectable()
export class MeRecordsService {
  constructor(@InjectDrizzle() private readonly db: NodePgDatabase) {}

  /** 내 영토: 칠한 지역 / 전체 시·군·구 */
  async territories(userId: string) {
    const [items, [{ total }]] = await Promise.all([
      this.db
        .select({
          regionCode: userRegionVisits.regionCode,
          regionName: regions.fullName,
          firstVisitedAt: userRegionVisits.firstVisitedAt,
        })
        .from(userRegionVisits)
        .innerJoin(regions, eq(regions.code, userRegionVisits.regionCode))
        .where(eq(userRegionVisits.userId, userId))
        .orderBy(asc(userRegionVisits.firstVisitedAt)),
      this.db
        .select({ total: count() })
        .from(regions)
        .where(eq(regions.level, 'sigungu')),
    ]);
    return {
      count: items.length,
      total,
      items: items.map((i) => ({
        ...i,
        firstVisitedAt: i.firstVisitedAt.toISOString(),
      })),
    };
  }

  /** 내 도감: 모은 음식 / 전체 음식 */
  async collection(userId: string) {
    const [items, [{ total }]] = await Promise.all([
      this.db
        .select({
          foodId: userFoodCollection.foodId,
          foodName: foods.name,
          imageUrl: foods.imageUrl,
          collectedAt: userFoodCollection.collectedAt,
        })
        .from(userFoodCollection)
        .innerJoin(foods, eq(foods.id, userFoodCollection.foodId))
        .where(eq(userFoodCollection.userId, userId))
        .orderBy(asc(userFoodCollection.collectedAt)),
      this.db.select({ total: count() }).from(foods),
    ]);
    return {
      count: items.length,
      total,
      items: items.map((i) => ({
        ...i,
        collectedAt: i.collectedAt.toISOString(),
      })),
    };
  }
}
