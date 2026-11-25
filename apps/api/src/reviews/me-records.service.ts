import { Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, asc, count, eq, isNotNull } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  foods,
  regions,
  restaurants,
  reviews,
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

  /**
   * 공유 화면용 영토: 공개 후기로 칠한 지역만.
   * user_region_visits는 처음 칠한 후기 하나만 기억하므로, 나만 보기 후기로 칠한 지역이
   * 남에게 보이지 않도록 공개 후기에서 직접 모은다(territories.service의 영토 주인·순위와 같은 원칙).
   */
  async publicTerritories(userId: string) {
    const [items, [{ total }]] = await Promise.all([
      this.db
        .selectDistinct({ regionCode: restaurants.regionCode })
        .from(reviews)
        .innerJoin(restaurants, eq(restaurants.id, reviews.restaurantId))
        .where(
          and(
            eq(reviews.userId, userId),
            eq(reviews.visibility, 'public'),
            isNotNull(restaurants.regionCode),
          ),
        ),
      this.db
        .select({ total: count() })
        .from(regions)
        .where(eq(regions.level, 'sigungu')),
    ]);
    const codes = items
      .map((i) => i.regionCode)
      .filter((c): c is string => c != null)
      .sort();
    return {
      count: codes.length,
      total,
      items: codes.map((regionCode) => ({ regionCode })),
    };
  }

  /** 공유 화면용 도감: 공개 후기로 모은 음식만(위와 같은 이유). */
  async publicCollection(userId: string) {
    const [items, [{ total }]] = await Promise.all([
      this.db
        .selectDistinct({
          foodId: foods.id,
          foodName: foods.name,
          imageUrl: foods.imageUrl,
        })
        .from(reviews)
        .innerJoin(foods, eq(foods.id, reviews.foodId))
        .where(
          and(eq(reviews.userId, userId), eq(reviews.visibility, 'public')),
        )
        .orderBy(asc(foods.id)),
      this.db.select({ total: count() }).from(foods),
    ]);
    return { count: items.length, total, items };
  }
}
