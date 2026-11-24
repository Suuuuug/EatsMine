# DB 마이그레이션 (Drizzle + Supabase CLI)

스키마는 Drizzle(`apps/api/src/db/schema.ts`)로 정의하고, 마이그레이션 적용과 이력 관리는 Supabase CLI가 맡습니다.
`supabase/migrations/*.sql`이 원격 DB에 적용되는 SQL의 기준입니다. 이력은 원격 DB의 `supabase_migrations.schema_migrations`에 남습니다.

## 준비 (한 번)

1. [Supabase CLI](https://supabase.com/docs/guides/cli/getting-started) 설치
2. EatsMine Supabase 조직 초대 수락
3. 저장소 루트에서:

   ```bash
   supabase login
   supabase link --project-ref <프로젝트 ref>
   ```

마이그레이션 명령은 link된 프로젝트에 `--remote`로 붙습니다. CLI가 로그인 토큰으로 임시 역할을 만들어 접속하므로 DB 비밀번호를 명령에 넣지 않습니다.
`apps/api/.env`의 `DATABASE_URL`은 API 서버와 Drizzle Studio가 씁니다(`apps/api/.env.example` 참고).

## 흐름

```bash
# 1. apps/api/src/db/schema.ts 수정

# 2. SQL 생성: apps/api/drizzle/<타임스탬프>_<이름>/ 생성 후
#    supabase/migrations/<타임스탬프>_<이름>.sql 로 자동 복사
npm run db:generate -- --name <이름>

# 3. 원격에 무엇이 적용될지 확인 (DB 변경 없음)
npm run db:migrate:dry

# 4. 적용 (CLI가 묻는 확인 질문에 답해야 반영)
npm run db:migrate

# 적용 이력 보기
npm run db:status

# 데이터 보기 (Drizzle Studio)
npm run db:studio

# 복사만 다시 하기 (generate 없이)
npm run db:sync -w api
```

미리보기는 반드시 `npm run db:migrate:dry`로 합니다. `npm run db:migrate --dry-run`처럼 `--` 없이 쓰면 npm이 옵션을 가져가 실제 반영 명령이 됩니다. 이 실수를 막는 마지막 장치가 CLI의 확인 질문이므로 `--yes`는 막아 두었습니다.

## 규칙

- `apps/api/drizzle/`(스냅숏)과 `supabase/migrations/`를 **같은 커밋**에 넣습니다. 스냅숏이 없으면 다음 generate가 틀린 차이를 만듭니다.
- 이미 적용된 마이그레이션 파일은 고치지 않습니다. 바꿀 게 있으면 schema.ts를 고쳐 새로 generate 합니다. 복사 스크립트는 같은 이름에 다른 내용이 하나라도 있으면 아무것도 복사하지 않고 실패합니다.
- `db:migrate`와 `db:migrate:dry`는 실행 전에 `apps/api/drizzle/`과 `supabase/migrations/`가 정확히 대응하는지 검사합니다(`npm run db:sync -w api -- --check`와 같음). 복사 안 된 것, 내용이 다른 것, drizzle 원본 없는 파일이 있으면 원격 작업을 하지 않습니다.
- RLS 정책·함수처럼 Drizzle이 만들지 않는 SQL은 `supabase migration new manual_<이름>`으로 만들고 파일 이름에 `_manual_`이 들어가게 합니다. 이 표시가 없으면 검사가 막습니다.
- 셸에 `SUPABASE_YES`가 남아 있어도 스크립트가 지워서 확인 질문을 건너뛰지 않습니다.
- `drizzle-kit push`, `drizzle-kit migrate`는 쓰지 않습니다(`npm run db:push -w api`는 막아 둠). Supabase 이력과 어긋납니다.
- 기준선: 2026-11-24 확인 시점에 원격 `public` 스키마는 비어 있었고 Drizzle·Supabase 어느 쪽 이력도 없었습니다. 그래서 첫 마이그레이션부터 이 흐름으로 시작하며 `supabase migration repair`가 필요 없습니다. 누군가 이 흐름 밖에서 테이블을 만들었다면 먼저 팀에 알리고 `supabase migration repair`로 이력을 맞춥니다.
- API는 postgres 계정으로 DB에 붙어 RLS를 우회합니다. 사용자별 데이터 접근 제한은 NestJS 코드에서 검사합니다.
- `DATABASE_URL`, DB 비밀번호, `.env`는 커밋하지 않습니다.
