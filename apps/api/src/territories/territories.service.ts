import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, eq, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { AppException } from '../common/app-exception.js';
import { profiles, regions, restaurants, reviews } from '../db/schema.js';
import { type RankKey, rankLabel } from '../profiles/ranks.js';

/** 영토 주인 집계 기간 (D10, 인기 지역과 같은 30일) */
export const TERRITORY_WINDOW_DAYS = 30;

export type TerritoryOwner = {
  regionCode: string;
  ownerNickname: string;
  /** 최근 30일 그 지역 매장에 남긴 리뷰 수 */
  reviewCount: number;
};

/** 지역 순위에서 목록으로 보여줄 인원 */
export const RANKING_LIMIT = 10;

export type RankingEntryDto = {
  /** 1부터. 동점이면 먼저 도달한 사람이 앞 (영토 주인과 같은 기준) */
  position: number;
  nickname: string;
  rank: RankKey;
  rankLabel: string;
  avatarUrl: string | null;
  reviewCount: number;
  isMe: boolean;
};

export type RegionRankingDto = {
  region: { code: string; fullName: string };
  windowDays: number;
  /** 상위 RANKING_LIMIT명 (1위 = 영토 주인) */
  items: RankingEntryDto[];
  /** 로그인했고 이 지역에 최근 30일 리뷰가 있으면 내 순위 (목록 밖이어도), 아니면 null */
  me: RankingEntryDto | null;
};

type RankingRow = {
  position: number | string;
  user_id: string;
  review_count: number | string;
  nickname: string;
  rank: RankKey;
  avatar_url: string | null;
};

export function toRankingEntries(
  rows: RankingRow[],
  meId: string | null,
): Pick<RegionRankingDto, 'items' | 'me'> {
  const entries = rows.map((r) => ({
    position: Number(r.position),
    nickname: r.nickname,
    rank: r.rank,
    rankLabel: rankLabel(r.rank),
    avatarUrl: r.avatar_url,
    reviewCount: Number(r.review_count),
    isMe: meId != null && r.user_id === meId,
  }));
  return {
    items: entries.filter((e) => e.position <= RANKING_LIMIT),
    me: entries.find((e) => e.isMe) ?? null,
  };
}

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

  /**
   * 지역 안 사용자 순위 (도감 "이 지역 순위"). 기준은 영토 주인과 같다:
   * 최근 30일 그 지역 매장 리뷰 수, 동점이면 먼저 도달한 사람.
   */
  async ranking(
    regionCode: string,
    meId: string | null,
  ): Promise<RegionRankingDto> {
    const [region] = await this.db
      .select({ code: regions.code, fullName: regions.fullName })
      .from(regions)
      .where(and(eq(regions.code, regionCode), eq(regions.level, 'sigungu')))
      .limit(1);
    if (!region) {
      throw new AppException(
        'NOT_FOUND',
        '존재하지 않는 지역이에요.',
        HttpStatus.NOT_FOUND,
      );
    }
    const result = await this.db.execute<RankingRow>(sql`
      WITH counts AS (
        SELECT ${reviews.userId} AS user_id,
               count(*)::int AS review_count, max(${reviews.createdAt}) AS reached_at
        FROM ${reviews}
        JOIN ${restaurants} ON ${restaurants.id} = ${reviews.restaurantId}
        WHERE ${restaurants.regionCode} = ${regionCode}
          AND ${reviews.createdAt} >= now() - make_interval(days => ${TERRITORY_WINDOW_DAYS})
        GROUP BY 1
      ), ranked AS (
        SELECT user_id, review_count,
               row_number() OVER (ORDER BY review_count DESC, reached_at ASC, user_id) AS position
        FROM counts
      )
      SELECT r.position, r.user_id, r.review_count, p.nickname, p.rank, p.avatar_url
      FROM ranked r
      JOIN ${profiles} p ON p.id = r.user_id
      WHERE r.position <= ${RANKING_LIMIT} OR r.user_id = ${meId}::uuid
      ORDER BY r.position
    `);
    return {
      region,
      windowDays: TERRITORY_WINDOW_DAYS,
      ...toRankingEntries(result.rows, meId),
    };
  }
}
