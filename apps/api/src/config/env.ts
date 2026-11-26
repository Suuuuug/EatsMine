import { z } from 'zod';

const emptyToUndefined = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

const inquiryEmailsSchema = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .transform((raw) =>
      raw
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    )
    .pipe(
      z
        .array(z.email('INQUIRY_TO_EMAIL은 올바른 이메일 형식이어야 합니다'))
        .min(1, 'INQUIRY_TO_EMAIL에 이메일을 하나 이상 입력해 주세요'),
    )
    .optional(),
);

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
  /** 문의하기 메일 발송용 Resend API 키 (선택 — 미설정 시 POST /inquiries가 503 반환) */
  RESEND_API_KEY: z.preprocess(
    emptyToUndefined,
    z.string().trim().min(1).optional(),
  ),
  /** 문의 접수 개발자 이메일 (쉼표로 여러 개 지정 가능, 선택) */
  INQUIRY_TO_EMAIL: inquiryEmailsSchema,
  /** 문의 메일 발신자 (도메인 인증 전 기본값: onboarding@resend.dev) */
  INQUIRY_FROM_EMAIL: z
    .string()
    .trim()
    .min(1)
    .default('EatsMine <onboarding@resend.dev>'),
  INQUIRY_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),
  /**
   * Supabase service role(secret) 키 — 리뷰 사진 저장소(Storage) 서명 URL 발급·확인·삭제용.
   * RLS를 무시하는 관리자 키라 api 서버에만 둔다. 없으면 사진 기능만 503으로 막고 서버는 뜬다.
   */
  SUPABASE_SERVICE_ROLE_KEY: z.preprocess(
    emptyToUndefined,
    z.string().trim().min(1).optional(),
  ),
  /** 리뷰 사진 비공개 버킷 이름 */
  REVIEW_PHOTO_BUCKET: z
    .string()
    .regex(/^[a-z0-9-]+$/, '버킷 이름은 영문 소문자·숫자·-만 써요')
    .default('review-photos'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`환경변수 설정 오류:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
