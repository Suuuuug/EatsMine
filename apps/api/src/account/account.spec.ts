import {
  type INestApplication,
  StandardSchemaValidationPipe,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthGuard } from '../auth/auth.guard.js';
import { HttpExceptionFilter } from '../common/http-exception.filter.js';
import { RateLimitGuard } from '../common/rate-limit/rate-limit.guard.js';
import type { Env } from '../config/env.js';
import type { PhotoStorage } from '../reviews/photo-storage.js';
import { AccountController } from './account.controller.js';
import { AccountService } from './account.service.js';

const user = {
  id: '6f1c2a3e-1111-4222-8333-944455556666',
  email: null,
  avatarUrl: null,
};

function service(key: string | null = 'service-key') {
  const values: Partial<Env> = {
    SUPABASE_URL: 'https://abcd.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: key ?? undefined,
  };
  const config = { get: (name: keyof Env) => values[name] };
  const storage = {
    listUserFolder: vi.fn().mockResolvedValue([`${user.id}/a.jpg`]),
    remove: vi.fn().mockResolvedValue(undefined),
  };
  const svc = new AccountService(
    config as unknown as ConfigService<Env, true>,
    storage as unknown as PhotoStorage,
  );
  return { svc, storage };
}

describe('AccountService.deleteAccount', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('사진 목록을 먼저 모으고 → 계정 삭제 → 사진 삭제 순서', async () => {
    const order: string[] = [];
    const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      order.push(`${init.method} ${url}`);
      return new Response(null, { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);
    const { svc, storage } = service();
    storage.listUserFolder.mockImplementation(async () => {
      order.push('list');
      return [`${user.id}/a.jpg`];
    });
    storage.remove.mockImplementation(async () => {
      order.push('remove');
    });
    await svc.deleteAccount(user);
    expect(order).toEqual([
      'list',
      `DELETE https://abcd.supabase.co/auth/v1/admin/users/${user.id}`,
      'remove',
    ]);
    const headers = fetchMock.mock.calls[0][1].headers as Record<
      string,
      string
    >;
    expect(headers.Authorization).toBe('Bearer service-key');
    expect(storage.remove).toHaveBeenCalledWith([`${user.id}/a.jpg`]);
  });

  it('계정 삭제가 실패하면 502이고 사진은 지우지 않는다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 500 })),
    );
    const { svc, storage } = service();
    await expect(svc.deleteAccount(user)).rejects.toMatchObject({
      status: 502,
    });
    expect(storage.remove).not.toHaveBeenCalled();
  });

  it('이미 지워진 계정(404)은 탈퇴가 끝난 것으로 본다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 404 })),
    );
    const { svc, storage } = service();
    await expect(svc.deleteAccount(user)).resolves.toBeUndefined();
    expect(storage.remove).toHaveBeenCalled();
  });

  it('사진 목록을 못 읽어도 계정은 지운다', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const { svc, storage } = service();
    storage.listUserFolder.mockRejectedValue(new Error('storage down'));
    await svc.deleteAccount(user);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(storage.remove).not.toHaveBeenCalled();
  });

  it('service role 키가 없으면 503, 아무것도 부르지 않는다', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { svc, storage } = service(null);
    await expect(svc.deleteAccount(user)).rejects.toMatchObject({
      code: 'SERVICE_MISCONFIGURED',
      status: 503,
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(storage.listUserFolder).not.toHaveBeenCalled();
  });
});

describe('DELETE /me', () => {
  let app: INestApplication;
  const account = { deleteAccount: vi.fn() };
  let loggedIn = true;

  beforeEach(async () => {
    vi.clearAllMocks();
    loggedIn = true;
    const moduleRef = await Test.createTestingModule({
      controllers: [AccountController],
      providers: [{ provide: AccountService, useValue: account }],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: (ctx: {
          switchToHttp: () => { getRequest: () => Record<string, unknown> };
        }) => {
          if (!loggedIn) return false;
          ctx.switchToHttp().getRequest().user = user;
          return true;
        },
      })
      .overrideGuard(RateLimitGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new StandardSchemaValidationPipe());
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });
  afterEach(async () => {
    await app.close();
  });

  it('로그인한 사용자를 탈퇴시키고 204', async () => {
    account.deleteAccount.mockResolvedValue(undefined);
    await request(app.getHttpServer()).delete('/me').expect(204);
    expect(account.deleteAccount).toHaveBeenCalledWith(user);
  });

  it('로그인하지 않으면 막힌다', async () => {
    loggedIn = false;
    await request(app.getHttpServer()).delete('/me').expect(403);
    expect(account.deleteAccount).not.toHaveBeenCalled();
  });
});
