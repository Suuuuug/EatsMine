import { validateEnv } from './env.js';

const required = {
  DATABASE_URL: 'postgresql://u:p@host:5432/db',
  SUPABASE_URL: 'https://abcd.supabase.co/',
};

describe('validateEnv', () => {
  it('기본값을 채우고 SUPABASE_URL 끝의 / 를 없앤다', () => {
    expect(validateEnv(required)).toEqual({
      DATABASE_URL: 'postgresql://u:p@host:5432/db',
      SUPABASE_URL: 'https://abcd.supabase.co',
      WEB_ORIGIN: 'http://localhost:3000',
      PORT: 3000,
      EATPL_BASE_URL: 'https://k-skill-proxy.nomadamas.org',
      EATPL_TIMEOUT_MS: 8000,
      INQUIRY_FROM_EMAIL: 'EatsMine <onboarding@resend.dev>',
      INQUIRY_TIMEOUT_MS: 8000,
      REVIEW_PHOTO_BUCKET: 'review-photos',
    });
  });

  it('문의하기 환경변수는 빈 문자열이면 미설정으로 두고, 쉼표 구분 이메일을 파싱한다', () => {
    const empty = validateEnv({
      ...required,
      RESEND_API_KEY: '   ',
      INQUIRY_TO_EMAIL: '',
    });
    expect(empty.RESEND_API_KEY).toBeUndefined();
    expect(empty.INQUIRY_TO_EMAIL).toBeUndefined();

    const configured = validateEnv({
      ...required,
      RESEND_API_KEY: ' re_test_123 ',
      INQUIRY_TO_EMAIL: ' dev1@example.com, dev2@example.com ',
    });
    expect(configured.RESEND_API_KEY).toBe('re_test_123');
    expect(configured.INQUIRY_TO_EMAIL).toEqual([
      'dev1@example.com',
      'dev2@example.com',
    ]);
  });

  it('INQUIRY_TO_EMAIL에 잘못된 이메일이 있으면 실패한다', () => {
    expect(() =>
      validateEnv({ ...required, INQUIRY_TO_EMAIL: 'not-an-email' }),
    ).toThrow(/INQUIRY_TO_EMAIL/);
  });

  it('DATABASE_URL이 없으면 시작 단계에서 실패한다', () => {
    expect(() => validateEnv({ SUPABASE_URL: required.SUPABASE_URL })).toThrow(
      /DATABASE_URL/,
    );
  });

  it('postgres 연결 문자열이 아니면 실패한다', () => {
    expect(() =>
      validateEnv({ ...required, DATABASE_URL: 'http://example.com' }),
    ).toThrow(/postgresql/);
  });

  it('SUPABASE_URL이 없거나 https가 아니면 실패한다', () => {
    expect(() => validateEnv({ DATABASE_URL: required.DATABASE_URL })).toThrow(
      /SUPABASE_URL/,
    );
    expect(() =>
      validateEnv({ ...required, SUPABASE_URL: 'http://abcd.supabase.co' }),
    ).toThrow(/https/);
  });
});
