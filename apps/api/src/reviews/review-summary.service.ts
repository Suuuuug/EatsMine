import { Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, count, desc, eq, inArray, ne, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { profiles, reviews } from '../db/schema.js';

/** 검색 결과 카드용 공개 후기 요약 (공개 후기가 없으면 null) */
export type ReviewSummaryDto = {
  average: number;
  count: number;
  /** 대표 후기 — 내용이 있는 공개 후기 중 가장 최근 것. 내용 있는 후기가 없으면 null */
  featured: {
    id: number;
    nickname: string;
    rating: number;
    content: string;
  } | null;
};

/** 평균은 소수 첫째 자리까지 */
export function roundAverage(avg: number): number {
  return Math.round(avg * 10) / 10;
}

export function buildSummaries(
  aggregates: { restaurantId: string; n: number; avg: string | null }[],
  featured: {
    restaurantId: string;
    id: number;
    nickname: string;
    rating: number;
    content: string | null;
  }[],
): Map<string, ReviewSummaryDto> {
  const featuredBy = new Map(featured.map((f) => [f.restaurantId, f]));
  const result = new Map<string, ReviewSummaryDto>();
  for (const a of aggregates) {
    const n = Number(a.n);
    const avg = a.avg == null ? NaN : Number(a.avg);
    if (n <= 0 || !Number.isFinite(avg)) continue;
    const f = featuredBy.get(a.restaurantId);
    result.set(a.restaurantId, {
      average: roundAverage(avg),
      count: n,
      featured: f?.content
        ? {
            id: f.id,
            nickname: f.nickname,
            rating: f.rating,
            content: f.content,
          }
        : null,
    });
  }
  return result;
}

@Injectable()
export class ReviewSummaryService {
  constructor(@InjectDrizzle() private readonly db: NodePgDatabase) {}

  /** 매장 ID 목록의 공개 후기 요약을 한 번에 계산한다 (쿼리 2번). 후기 없는 매장은 결과에 없다 */
  async forRestaurants(
    restaurantIds: readonly string[],
  ): Promise<Map<string, ReviewSummaryDto>> {
    const ids = [...new Set(restaurantIds)];
    if (!ids.length) return new Map();
    const isPublic = and(
      inArray(reviews.restaurantId, ids),
      eq(reviews.visibility, 'public'),
    );
    const [aggregates, featured] = await Promise.all([
      this.db
        .select({
          restaurantId: reviews.restaurantId,
          n: count(),
          avg: sql<string | null>`avg(${reviews.rating})`,
        })
        .from(reviews)
        .where(isPublic)
        .groupBy(reviews.restaurantId),
      this.db
        .selectDistinctOn([reviews.restaurantId], {
          restaurantId: reviews.restaurantId,
          id: reviews.id,
          nickname: profiles.nickname,
          rating: reviews.rating,
          content: reviews.content,
        })
        .from(reviews)
        .innerJoin(profiles, eq(profiles.id, reviews.userId))
        .where(and(isPublic, ne(reviews.content, '')))
        .orderBy(
          reviews.restaurantId,
          desc(reviews.createdAt),
          desc(reviews.id),
        ),
    ]);
    return buildSummaries(aggregates, featured);
  }
}
