import { validateEnv } from './env.js';

describe('validateEnv', () => {
  it('기본값을 채운다', () => {
    expect(
      validateEnv({ DATABASE_URL: 'postgresql://u:p@host:5432/db' }),
    ).toEqual({
      DATABASE_URL: 'postgresql://u:p@host:5432/db',
      WEB_ORIGIN: 'http://localhost:3000',
      PORT: 4000,
      EATPL_BASE_URL: 'https://k-skill-proxy.nomadamas.org',
      EATPL_TIMEOUT_MS: 8000,
    });
  });

  it('DATABASE_URL이 없으면 시작 단계에서 실패한다', () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL/);
  });

  it('postgres 연결 문자열이 아니면 실패한다', () => {
    expect(() => validateEnv({ DATABASE_URL: 'http://example.com' })).toThrow(
      /postgresql/,
    );
  });
});
