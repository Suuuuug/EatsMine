import { HttpStatus } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { AppException } from '../common/app-exception.js';
import type { Env } from '../config/env.js';
import { buildInquiryEmail, InquiriesService } from './inquiries.service.js';

function createConfig(overrides: Partial<Env> = {}): ConfigService<Env, true> {
  const values: Partial<Env> = {
    RESEND_API_KEY: 're_test_key',
    INQUIRY_TO_EMAIL: ['dev@example.com'],
    INQUIRY_FROM_EMAIL: 'EatsMine <onboarding@resend.dev>',
    INQUIRY_TIMEOUT_MS: 8000,
    ...overrides,
  };
  return {
    get: (key: keyof Env) => values[key],
  } as unknown as ConfigService<Env, true>;
}

describe('buildInquiryEmail', () => {
  it('제목의 개행을 정리하고 40자 초과 시 말줄임을 붙인다', () => {
    const built = buildInquiryEmail(
      {
        type: 'privacy',
        email: 'user@example.com',
        content: '첫째 줄 문의\n둘째 줄에서 아주 길게 이어지는 개인정보 삭제 요청 내용입니다 확인 부탁드립니다.',
      },
      { id: 'user-123', email: 'login@example.com' },
      new Date('2026-11-26T00:30:00.000Z'),
    );

    expect(built.replyTo).toBe('user@example.com');
    expect(built.subject).not.toMatch(/[\r\n]/);
    expect(built.subject.startsWith('[EatsMine 문의 · 개인정보] ')).toBe(true);
    expect(built.subject.endsWith('…')).toBe(true);
    expect(built.text).toContain('답변 받을 이메일: user@example.com');
    expect(built.text).toContain('로그인 회원 (user-123)');
    expect(built.text).toContain('KST');
  });

  it('비로그인 사용자는 회원 여부에 비로그인으로 표시한다', () => {
    const built = buildInquiryEmail({
      type: 'etc',
      email: 'guest@example.com',
      content: '가나다라마바사아자차',
    });
    expect(built.subject).toBe('[EatsMine 문의 · 기타] 가나다라마바사아자차');
    expect(built.text).toContain('회원 여부: 비로그인');
  });
});

describe('InquiriesService', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('Resend HTTP API로 개발자 메일을 발송하고 { ok: true }를 반환한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 'email_123' }), { status: 200 }),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const service = new InquiriesService(
      createConfig({
        INQUIRY_TO_EMAIL: ['dev1@example.com', 'dev2@example.com'],
      }),
    );

    const res = await service.send(
      {
        type: 'service',
        email: 'asker@example.com',
        content: '서비스 이용 방법이 궁금해서 문의드립니다.',
      },
      null,
    );

    expect(res).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({
      Authorization: 'Bearer re_test_key',
      'Content-Type': 'application/json',
    });
    expect(typeof init.body).toBe('string');
    const payload = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(payload).toMatchObject({
      from: 'EatsMine <onboarding@resend.dev>',
      to: ['dev1@example.com', 'dev2@example.com'],
      reply_to: 'asker@example.com',
    });
    expect(payload.subject).toEqual(
      expect.stringContaining('[EatsMine 문의 · 서비스 이용]'),
    );
    expect(payload.text).toEqual(
      expect.stringContaining('서비스 이용 방법이 궁금해서 문의드립니다.'),
    );
  });

  it('RESEND_API_KEY 또는 INQUIRY_TO_EMAIL이 없으면 503 SERVICE_MISCONFIGURED', async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const noKey = new InquiriesService(createConfig({ RESEND_API_KEY: undefined }));
    const noEmail = new InquiriesService(
      createConfig({ INQUIRY_TO_EMAIL: undefined }),
    );

    for (const service of [noKey, noEmail]) {
      await expect(
        service.send({
          type: 'etc',
          email: 'a@b.co',
          content: '가나다라마바사아자차',
        }),
      ).rejects.toMatchObject({
        code: 'SERVICE_MISCONFIGURED',
      });
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('Resend 응답이 실패(5xx/4xx)하거나 네트워크 오류면 502 INQUIRY_UNAVAILABLE', async () => {
    const service = new InquiriesService(createConfig());

    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(new Response('error', { status: 500 })) as unknown as typeof fetch;
    await expect(
      service.send({
        type: 'error',
        email: 'a@b.co',
        content: '가나다라마바사아자차',
      }),
    ).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof AppException &&
        err.code === 'INQUIRY_UNAVAILABLE' &&
        err.getStatus() === HttpStatus.BAD_GATEWAY,
    );

    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(new Error('network down')) as unknown as typeof fetch;
    await expect(
      service.send({
        type: 'error',
        email: 'a@b.co',
        content: '가나다라마바사아자차',
      }),
    ).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof AppException &&
        err.code === 'INQUIRY_UNAVAILABLE' &&
        err.getStatus() === HttpStatus.BAD_GATEWAY,
    );
  });
});
