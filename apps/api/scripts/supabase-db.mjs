// Supabase CLI로 link된 원격 프로젝트의 마이그레이션을 다룬다.
//   node scripts/supabase-db.mjs status          → supabase migration list --remote
//   node scripts/supabase-db.mjs push [--dry-run] → supabase db push --remote
// link된 프로젝트에 --remote로 붙으면 CLI가 로그인 토큰으로 임시 역할을 만들어 접속한다.
// DB 비밀번호나 DATABASE_URL을 명령 인자로 넘기지 않는다(프로세스 목록에 남지 않게).
// Supabase CLI v3는 기본 대상이 로컬이라 --remote를 반드시 붙인다.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..', '..');
const commands = {
  status: ['migration', 'list'],
  push: ['db', 'push'],
};

const [name, ...extra] = process.argv.slice(2);
if (!commands[name]) {
  console.error('사용법: node scripts/supabase-db.mjs <status|push> [--dry-run]');
  process.exit(2);
}

if (name === 'push') {
  if (extra.some((arg) => arg === '--yes' || arg.startsWith('--yes='))) {
    console.error('--yes는 쓰지 않습니다. 원격 반영 전 확인 질문이 마지막 안전장치입니다.');
    process.exit(2);
  }
  // `npm run db:migrate --dry-run`처럼 `--` 없이 쓰면 npm이 옵션을 가져가고 이 값만 남긴다.
  if (process.env.npm_config_dry_run === 'true' && !extra.includes('--dry-run')) {
    console.error('npm이 --dry-run을 가져갔습니다. 미리보기는 `npm run db:migrate:dry`로 하세요. 아무것도 실행하지 않았습니다.');
    process.exit(2);
  }
  // 적용 전에 drizzle 원본과 supabase/migrations가 정확히 대응하는지 검사한다.
  // 테스트용 경로 재정의 변수는 빼서, 실제로 적용할 저장소 폴더만 검사한다.
  const checkEnv = { ...process.env };
  delete checkEnv.DRIZZLE_OUT_DIR;
  delete checkEnv.SUPABASE_MIGRATIONS_DIR;
  const check = spawnSync(process.execPath, [join(here, 'sync-supabase-migrations.mjs'), '--check'], {
    stdio: 'inherit',
    env: checkEnv,
  });
  if (check.status !== 0) {
    console.error('마이그레이션 검사에 실패해 원격 작업을 하지 않았습니다.');
    process.exit(1);
  }
}

// 자동 승인 환경변수가 셸에 남아 있어도 확인 질문을 건너뛰지 않게 자식 환경에서 뺀다.
const childEnv = { ...process.env };
delete childEnv.SUPABASE_YES;

if (!existsSync(join(repoRoot, 'supabase', '.temp', 'project-ref'))) {
  console.error('link된 Supabase 프로젝트가 없습니다. 저장소 루트에서 먼저 실행하세요:');
  console.error('  supabase login');
  console.error('  supabase link --project-ref <프로젝트 ref>');
  process.exit(2);
}

const args = [...commands[name], '--remote', '--workdir', repoRoot, ...extra];
const result = spawnSync('supabase', args, { stdio: 'inherit', env: childEnv });
if (result.error) {
  if (result.error.code === 'ENOENT') {
    console.error('Supabase CLI가 없습니다. 설치: https://supabase.com/docs/guides/cli/getting-started');
  } else {
    console.error(`Supabase CLI 실행 실패: ${result.error.message}`);
  }
  process.exit(1);
}
process.exit(result.status ?? 1);
