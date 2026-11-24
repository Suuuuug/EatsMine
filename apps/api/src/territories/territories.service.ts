import { Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { profiles, restaurants, reviews } from '../db/schema.js';

/** 영토 주인 집계 기간 (D10, 인기 지역과 같은 30일) */
export const TERRITORY_WINDOW_DAYS = 30;

export type TerritoryOwner = {
  regionCode: string;
  ownerNickname: string;
  /** 최근 30일 그 지역 매장에 남긴 리뷰 수 */
  reviewCount: number;
};

@Injectable()
export class TerritoriesService {
  constructor(@InjectDrizzle() private readonly db: NodePgDatabase) {}

  /**
   * 공유 영토 (D10): 지역마다 최근 30일 리뷰를 가장 많이 남긴 사용자가 주인.
   * 동점이면 그 리뷰 수에 먼저 도달한 사용자 (= 마지막 리뷰 시각이 더 이른 사람).
   * 공개 범위: 닉네임 + 지역 단위 리뷰 수만.
   */
  async owners(): Promise<TerritoryOwner[]> {
    const result = await this.db.execute<{
      region_code: string;
      nickname: string;
      review_count: number;
    }>(sql`
      WITH counts AS (
        SELECT ${restaurants.regionCode} AS region_code, ${reviews.userId} AS user_id,
               count(*)::int AS review_count, max(${reviews.createdAt}) AS reached_at
        FROM ${reviews}
        JOIN ${restaurants} ON ${restaurants.id} = ${reviews.restaurantId}
        WHERE ${restaurants.regionCode} IS NOT NULL
          AND ${reviews.createdAt} >= now() - make_interval(days => ${TERRITORY_WINDOW_DAYS})
        GROUP BY 1, 2
      )
      SELECT DISTINCT ON (c.region_code) c.region_code, p.nickname, c.review_count
      FROM counts c
      JOIN ${profiles} p ON p.id = c.user_id
      ORDER BY c.region_code, c.review_count DESC, c.reached_at ASC, c.user_id
    `);
    return result.rows.map((r) => ({
      regionCode: r.region_code,
      ownerNickname: r.nickname,
      reviewCount: Number(r.review_count),
    }));
  }
}
