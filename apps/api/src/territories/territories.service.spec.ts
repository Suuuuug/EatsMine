import { type SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { TerritoriesService } from './territories.service.js';

/** db.execute로 보낸 SQL을 문자열로 꺼내 공개 범위 조건을 확인한다 (DB 없이) */
function fakeDb() {
  const executed: string[] = [];
  const db = {
    execute: async (query: SQL) => {
      executed.push(new PgDialect().sqlToQuery(query).sql);
      return { rows: [] };
    },
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [{ code: '11140', fullName: '서울특별시 중구' }],
        }),
      }),
    }),
  };
  return { db: db as unknown as NodePgDatabase, executed };
}

describe('TerritoriesService 공개 범위', () => {
  it('영토 주인은 공개(public) 리뷰만 센다', async () => {
    const { db, executed } = fakeDb();
    await new TerritoriesService(db).owners();
    expect(executed[0]).toMatch(/"visibility" = 'public'/);
  });

  it('지역 순위도 공개(public) 리뷰만 센다', async () => {
    const { db, executed } = fakeDb();
    await new TerritoriesService(db).ranking('11140', null);
    expect(executed[0]).toMatch(/"visibility" = 'public'/);
  });
});
