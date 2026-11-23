// drizzle-kit(1.0) generate 결과를 Supabase CLI 마이그레이션 형식으로 복사·검사한다.
//   apps/api/drizzle/<14자리 타임스탬프>_<이름>/migration.sql
//   → supabase/migrations/<14자리 타임스탬프>_<이름>.sql
//
//   node sync-supabase-migrations.mjs          복사(문제가 하나라도 있으면 아무것도 복사하지 않음)
//   node sync-supabase-migrations.mjs --check  검사만(원격 적용 전 supabase-db.mjs가 호출)
//
// 문제로 보는 것
// - 같은 이름인데 내용이 다른 파일(적용된 마이그레이션은 고치지 않는다)
// - migration.sql이 없는 drizzle 폴더
// - drizzle 원본이 없는 supabase 파일. 단 손으로 쓴 SQL은 이름에 `_manual_`을 넣어 구분한다.
// - (--check) 아직 복사되지 않은 drizzle 마이그레이션
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = resolve(process.env.DRIZZLE_OUT_DIR ?? join(here, '..', 'drizzle'));
const dstDir = resolve(process.env.SUPABASE_MIGRATIONS_DIR ?? join(here, '..', '..', '..', 'supabase', 'migrations'));
const checkOnly = process.argv.includes('--check');
const FOLDER = /^\d{14}_[\w-]+$/;
const MIGRATION_FILE = /^\d{14}_[\w-]+\.sql$/;
const MANUAL = /^\d{14}_manual_[\w-]+\.sql$/;
const normalize = (text) => text.replace(/\r\n/g, '\n');

const listDirs = (dir) =>
  existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort()
    : [];
const listFiles = (dir) =>
  existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true }).filter((e) => e.isFile()).map((e) => e.name).sort()
    : [];

const problems = [];
const toCopy = [];
const sources = new Set();
let unchanged = 0;

for (const name of listDirs(srcDir)) {
  if (!FOLDER.test(name)) {
    problems.push(`drizzle 폴더 이름이 <타임스탬프>_<이름> 형식이 아님: ${name}`);
    continue;
  }
  const sqlPath = join(srcDir, name, 'migration.sql');
  if (!existsSync(sqlPath)) {
    problems.push(`migration.sql 없음: apps/api/drizzle/${name}`);
    continue;
  }
  sources.add(`${name}.sql`);
  const sql = readFileSync(sqlPath, 'utf8');
  const target = join(dstDir, `${name}.sql`);
  if (!existsSync(target)) {
    toCopy.push({ name, target, sql });
  } else if (normalize(readFileSync(target, 'utf8')) === normalize(sql)) {
    unchanged += 1;
  } else {
    problems.push(`내용이 다름: supabase/migrations/${name}.sql (적용된 마이그레이션은 고치지 말고 새로 generate)`);
  }
}

for (const file of listFiles(dstDir)) {
  if (file.startsWith('.')) continue;
  if (!MIGRATION_FILE.test(file)) {
    problems.push(`supabase/migrations에 마이그레이션 형식이 아닌 파일: ${file}`);
  } else if (!sources.has(file) && !MANUAL.test(file)) {
    problems.push(`drizzle 원본이 없는 파일: supabase/migrations/${file} (손으로 쓴 SQL이면 이름에 _manual_ 표시)`);
  }
}

if (checkOnly && toCopy.length > 0) {
  problems.push(`아직 복사되지 않은 마이그레이션 ${toCopy.length}개: ${toCopy.map((c) => c.name).join(', ')} (npm run db:sync -w api)`);
}

if (problems.length > 0) {
  console.error('마이그레이션 폴더가 맞지 않습니다:');
  for (const p of problems) console.error(`  - ${p}`);
  if (!checkOnly) console.error('아무것도 복사하지 않았습니다.');
  process.exit(1);
}

if (checkOnly) {
  console.log(`검사 통과: drizzle ${sources.size}개와 supabase/migrations가 일치합니다.`);
  process.exit(0);
}

if (toCopy.length > 0) mkdirSync(dstDir, { recursive: true });
for (const { name, target, sql } of toCopy) {
  writeFileSync(target, sql);
  console.log(`복사: supabase/migrations/${name}.sql`);
}
console.log(`완료: 새로 복사 ${toCopy.length}, 그대로 ${unchanged}`);
