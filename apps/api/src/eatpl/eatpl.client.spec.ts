import type { ConfigService } from '@nestjs/config';
import { AppException } from '../common/app-exception.js';
import type { Env } from '../config/env.js';
import { EatplClient } from './eatpl.client.js';

const item = {
  merNm: '부촌',
  merAddr: '서울 종로구 종로 200-12',
  merUrl: 'https://web.paybooc.ai/mer/web/profile/3x5ATwfSkOmIcXDE2Q2MDg',
};

const config = {
  get: (key: keyof Env) =>
    ({ EATPL_BASE_URL: 'https://proxy.test/', EATPL_TIMEOUT_MS: 1000 })[
      key as string
    ],
} as unknown as ConfigService<Env, true>;

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

describe('EatplClient', () => {
  const fetchMock = vi.fn();
  const client = new EatplClient(config);

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterAll(() => vi.unstubAllGlobals());

  it('프록시 파라미터 이름으로 호출하고 결과를 변환한다', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ items: [item, { merNm: '링크 없음', merAddr: 'x' }] }),
    );
    const places = await client.search({
      location: '서울 종로구',
      genre: '고기구이',
    });

    const url = new URL(fetchMock.mock.calls[0][0] as URL);
    expect(url.origin + url.pathname).toBe(
      'https://proxy.test/v1/bccard-eatpl/search',
    );
    expect(url.searchParams.get('location')).toBe('서울 종로구');
    expect(url.searchParams.get('merTpbuzNm')).toBe('고기구이');
    expect(places.map((p) => p.id)).toEqual(['3x5ATwfSkOmIcXDE2Q2MDg']); // 링크 없는 매장 제외
  });

  it('공식 API 형식({ rspCode, data })도 처리한다', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ rspCode: '00000', rspMessage: 'Success', data: [item] }),
    );
    expect(await client.search({ location: '서울' })).toHaveLength(1);
  });

  it('결과 없음은 빈 배열', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ items: [] }));
    expect(await client.search({ location: '서울' })).toEqual([]);
  });

  const expectError = async (status: number, code: string) => {
    const err = await client
      .search({ location: '서울' })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AppException);
    expect((err as AppException).getStatus()).toBe(status);
    expect((err as AppException).code).toBe(code);
  };

  it('프록시 503은 503 SERVICE_MISCONFIGURED', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 503));
    await expectError(503, 'SERVICE_MISCONFIGURED');
  });

  it.each([401, 403, 500, 502])(
    '프록시 %i는 502 EATPL_UNAVAILABLE',
    async (status) => {
      fetchMock.mockResolvedValue(jsonResponse({}, status));
      await expectError(502, 'EATPL_UNAVAILABLE');
    },
  );

  it('연결 실패·시간 초과는 502', async () => {
    fetchMock.mockRejectedValue(new DOMException('timeout', 'TimeoutError'));
    await expectError(502, 'EATPL_UNAVAILABLE');
  });

  it('공식 API 실패 코드나 이상한 형식은 502', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ rspCode: '99999', data: [] }),
    );
    await expectError(502, 'EATPL_UNAVAILABLE');
    fetchMock.mockResolvedValueOnce(jsonResponse({ items: 'nope' }));
    await expectError(502, 'EATPL_UNAVAILABLE');
    fetchMock.mockResolvedValueOnce(new Response('<html>', { status: 200 }));
    await expectError(502, 'EATPL_UNAVAILABLE');
  });
});
