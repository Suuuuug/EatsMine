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
    });
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
