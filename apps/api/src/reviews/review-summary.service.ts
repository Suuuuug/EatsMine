import { Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, asc, count, desc, eq, inArray, ne, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { profiles, reviewPhotos, reviews } from '../db/schema.js';
import { PhotoStorage } from './photo-storage.js';

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
  /** 대표 사진 — 공개 리뷰 사진 중 가장 최근 리뷰의 첫 사진(1시간 유효 서명 URL). 없으면 null */
  photoUrl: string | null;
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
  photoUrls: ReadonlyMap<string, string> = new Map(),
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
      photoUrl: photoUrls.get(a.restaurantId) ?? null,
    });
  }
  return result;
}

@Injectable()
export class ReviewSummaryService {
  constructor(
    @InjectDrizzle() private readonly db: NodePgDatabase,
    private readonly photoStorage: PhotoStorage,
  ) {}

  /** 매장 ID 목록의 공개 후기 요약을 한 번에 계산한다 (쿼리 3번 + 대표 사진 서명 1번). 후기 없는 매장은 결과에 없다 */
  async forRestaurants(
    restaurantIds: readonly string[],
  ): Promise<Map<string, ReviewSummaryDto>> {
    const ids = [...new Set(restaurantIds)];
    if (!ids.length) return new Map();
    const isPublic = and(
      inArray(reviews.restaurantId, ids),
      eq(reviews.visibility, 'public'),
    );
    const [aggregates, featured, photos] = await Promise.all([
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
      // 매장마다 가장 최근 공개 리뷰의 첫 사진
      this.db
        .selectDistinctOn([reviews.restaurantId], {
          restaurantId: reviews.restaurantId,
          path: reviewPhotos.storagePath,
        })
        .from(reviewPhotos)
        .innerJoin(reviews, eq(reviews.id, reviewPhotos.reviewId))
        .where(isPublic)
        .orderBy(
          reviews.restaurantId,
          desc(reviews.createdAt),
          desc(reviews.id),
          asc(reviewPhotos.position),
        ),
    ]);
    const signed = await this.photoStorage.signedUrls(
      photos.map((p) => p.path),
    );
    const photoUrls = new Map<string, string>();
    for (const p of photos) {
      const url = signed.get(p.path);
      if (url) photoUrls.set(p.restaurantId, url);
    }
    return buildSummaries(aggregates, featured, photoUrls);
  }
}
