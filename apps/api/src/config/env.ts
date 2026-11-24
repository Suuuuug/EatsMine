import { z } from 'zod';

/** 서버 시작 시 검증하는 환경변수. 값이 없거나 잘못되면 시작 단계에서 바로 실패한다. */
export const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .regex(
      /^postgres(ql)?:\/\//,
      'postgresql:// 로 시작하는 연결 문자열이어야 합니다',
    ),
  /** CORS 허용 도메인. 여러 개면 쉼표로 구분 */
  WEB_ORIGIN: z.string().min(1).default('http://localhost:3000'),
  /** Vercel NestJS 문서 기본값과 같은 3000. 로컬은 .env의 PORT=4000 (프론트 3000과 분리) */
  PORT: z.coerce.number().int().positive().default(3000),
  /** 잇플 검색 API 주소 (D3: k-skill 프록시, 공식 API 전환 시 교체) */
  EATPL_BASE_URL: z.url().default('https://k-skill-proxy.nomadamas.org'),
  EATPL_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),
  /** Supabase 프로젝트 주소 (https://<ref>.supabase.co) — 로그인 토큰 검증용 공개 키·발급자 (D6) */
  SUPABASE_URL: z
    .url({
      protocol: /^https$/,
      error: 'https://<프로젝트 ref>.supabase.co 형식이어야 합니다',
    })
    .transform((url) => url.replace(/\/+$/, '')),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`환경변수 설정 오류:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
