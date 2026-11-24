/**
 * data/foods.json → foods, food_seasons, food_regions, food_genres
 * 실행: npm run db:seed:foods -w api   (음식 마이그레이션 적용 후)
 *
 * - 음식 이름 기준으로 있으면 갱신, 없으면 추가. 제철 월·지역·업종은 통째로 교체한다.
 * - foods.json에서 빠진 음식은 지우지 않고 경고만 한다 (리뷰가 가리킬 수 있음).
 * - 업종·지역 코드 유효성은 src/foods/foods-data.spec.ts(npm test)가 검사한다.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';

type FoodJson = {
  name: string;
  months: number[];
  description: string;
  genres: string[];
  searchKeyword: string | null;
  regions: { code: string; name: string; reason: string }[];
  imageUrl: string | null;
  sourceUrl: string | null;
};

try {
  process.loadEnvFile(join(import.meta.dirname, '..', '.env'));
} catch {
  /* .env 없으면 환경변수 사용 */
}
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL이 없습니다');

const foods: FoodJson[] = JSON.parse(
  readFileSync(join(import.meta.dirname, '..', 'data', 'foods.json'), 'utf-8'),
);

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query('BEGIN');
  for (const f of foods) {
    const { rows } = await client.query<{ id: number }>(
      `INSERT INTO foods (name, description, image_url, source_url, search_keyword)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (name) DO UPDATE SET
         description = EXCLUDED.description, image_url = EXCLUDED.image_url,
         source_url = EXCLUDED.source_url, search_keyword = EXCLUDED.search_keyword
       RETURNING id`,
      [f.name, f.description, f.imageUrl, f.sourceUrl, f.searchKeyword],
    );
    const id = rows[0].id;
    for (const table of ['food_seasons', 'food_regions', 'food_genres']) {
      await client.query(`DELETE FROM ${table} WHERE food_id = $1`, [id]);
    }
    for (const month of f.months) {
      await client.query(
        'INSERT INTO food_seasons (food_id, month) VALUES ($1, $2)',
        [id, month],
      );
    }
    for (const [position, r] of f.regions.entries()) {
      await client.query(
        'INSERT INTO food_regions (food_id, region_code, position, reason) VALUES ($1, $2, $3, $4)',
        [id, r.code, position, r.reason],
      );
    }
    for (const genre of f.genres) {
      await client.query(
        'INSERT INTO food_genres (food_id, genre) VALUES ($1, $2)',
        [id, genre],
      );
    }
  }
  await client.query('COMMIT');

  const { rows: extra } = await client.query<{ name: string }>(
    'SELECT name FROM foods WHERE NOT (name = ANY($1::text[])) ORDER BY id',
    [foods.map((f) => f.name)],
  );
  if (extra.length) {
    console.warn(
      `⚠️ foods.json에 없는 음식 ${extra.length}개 (지우지 않음): ${extra.map((e) => e.name).join(', ')}`,
    );
  }
  const { rows: counts } = await client.query<{ t: string; n: string }>(
    `SELECT 'foods' t, count(*) n FROM foods UNION ALL SELECT 'food_seasons', count(*) FROM food_seasons
     UNION ALL SELECT 'food_regions', count(*) FROM food_regions UNION ALL SELECT 'food_genres', count(*) FROM food_genres`,
  );
  console.log('음식 반영 완료:', counts.map((c) => `${c.t} ${c.n}`).join(', '));
} catch (e) {
  await client.query('ROLLBACK');
  throw e;
} finally {
  await client.end();
}
