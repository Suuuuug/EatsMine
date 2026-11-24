/**
 * data/regions.json → regions 테이블 (있으면 갱신)
 * 실행: npm run db:seed -w api   (마이그레이션 적용 후)
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';

type RegionJson = {
  code: string;
  parentCode: string | null;
  level: 'sido' | 'sigungu';
  name: string;
  fullName: string;
  eatplQuery: string | null;
  addressAliases: string[] | null;
};

try {
  process.loadEnvFile(join(import.meta.dirname, '..', '.env'));
} catch {
  /* .env 없으면 환경변수 사용 */
}
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL이 없습니다');

const regions: RegionJson[] = JSON.parse(
  readFileSync(join(import.meta.dirname, '..', 'data', 'regions.json'), 'utf-8'),
);
// FK(parent_code) 때문에 시·도 먼저
regions.sort((a, b) => (a.level === b.level ? 0 : a.level === 'sido' ? -1 : 1));

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query('BEGIN');
  for (const r of regions) {
    // center_lat/lng는 건드리지 않음 (P1에서 별도로 채움)
    await client.query(
      `INSERT INTO regions (code, parent_code, level, name, full_name, eatpl_query, address_aliases)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (code) DO UPDATE SET
         parent_code = EXCLUDED.parent_code, level = EXCLUDED.level, name = EXCLUDED.name,
         full_name = EXCLUDED.full_name, eatpl_query = EXCLUDED.eatpl_query,
         address_aliases = EXCLUDED.address_aliases`,
      [r.code, r.parentCode, r.level, r.name, r.fullName, r.eatplQuery, r.addressAliases],
    );
  }
  await client.query('COMMIT');
  const { rows } = await client.query<{ level: string; count: string }>(
    'SELECT level, count(*) FROM regions GROUP BY level ORDER BY level',
  );
  console.log('regions 반영 완료:', rows.map((r) => `${r.level} ${r.count}`).join(', '));
} catch (e) {
  await client.query('ROLLBACK');
  throw e;
} finally {
  await client.end();
}
