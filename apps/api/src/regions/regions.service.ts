import { Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { regions } from '../db/schema.js';
import { DEFAULT_POPULAR_REGION_CODES, POPULAR_REGION_COUNT } from './popular-regions.js';

/** API로 내보내는 지역 정보 (잇플 검색어·별칭 같은 내부 값은 제외) */
export type RegionDto = {
  code: string;
  name: string;
  fullName: string;
  centerLat: number | null;
  centerLng: number | null;
};

const SEARCH_LIMIT = 10;

const dtoColumns = {
  code: regions.code,
  name: regions.name,
  fullName: regions.fullName,
  centerLat: regions.centerLat,
  centerLng: regions.centerLng,
};

@Injectable()
export class RegionsService {
  constructor(@InjectDrizzle() private readonly db: NodePgDatabase) {}

  /**
   * 시·군·구 자동완성. 순서: 이름 일치 → 이름이 검색어로 시작 → 잇플 검색어(예전 시·도명 포함)가 검색어로 시작 → 나머지
   * 예) "광주" → 경기 광주시 → 광주 동구·서구… (옛 광주광역시) → 전남광주통합특별시의 시·군
   */
  async search(q: string): Promise<RegionDto[]> {
    const pattern = `%${escapeLike(q)}%`;
    const prefix = `${escapeLike(q)}%`;
    return this.db
      .select(dtoColumns)
      .from(regions)
      .where(
        and(
          eq(regions.level, 'sigungu'),
          or(ilike(regions.name, pattern), ilike(regions.fullName, pattern), ilike(regions.eatplQuery, pattern)),
        ),
      )
      .orderBy(
        sql`CASE
          WHEN ${regions.name} = ${q} THEN 0
          WHEN ${regions.name} ILIKE ${prefix} THEN 1
          WHEN ${regions.eatplQuery} ILIKE ${prefix} THEN 2
          ELSE 3
        END`,
        regions.code,
      )
      .limit(SEARCH_LIMIT);
  }

  /**
   * 인기 지역 (D5). 지금은 기본 목록만 사용.
   * TODO(8단계 리뷰): 최근 30일 리뷰 수 상위 지역을 먼저 넣고 부족분을 기본 목록으로 채운다.
   */
  async popular(): Promise<RegionDto[]> {
    const codes = DEFAULT_POPULAR_REGION_CODES.slice(0, POPULAR_REGION_COUNT);
    const rows = await this.db.select(dtoColumns).from(regions).where(inArray(regions.code, codes));
    const byCode = new Map(rows.map((r) => [r.code, r]));
    return codes.flatMap((c) => byCode.get(c) ?? []);
  }
}

/** ILIKE 패턴에서 %, _, \ 를 문자 그대로 검색하도록 이스케이프 */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}
