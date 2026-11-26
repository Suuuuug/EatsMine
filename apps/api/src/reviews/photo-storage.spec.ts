import type { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import { isOwnPhotoPath, newPhotoPath, PhotoStorage } from './photo-storage.js';

const USER = '6f1c2a3e-1111-4222-8333-944455556666';
const OTHER = '7a2b3c4d-1111-4222-8333-944455556666';
const FILE = '0b7f6c2a-2222-4333-8444-955566667777';

/** key가 null이면 service role 키가 없는 상태 */
function storage(key: string | null = 'service-key') {
  const values: Partial<Env> = {
    SUPABASE_URL: 'https://abcd.supabase.co',
    REVIEW_PHOTO_BUCKET: 'review-photos',
    SUPABASE_SERVICE_ROLE_KEY: key ?? undefined,
  };
  const config = { get: (name: keyof Env) => values[name] };
  return new PhotoStorage(config as unknown as ConfigService<Env, true>);
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

describe('사진 경로 규칙', () => {
  it('새 경로는 {userId}/{uuid}.확장자, 본인 폴더만 허용', () => {
    const path = newPhotoPath(USER, 'image/webp');
    expect(path).toMatch(new RegExp(`^${USER}/[0-9a-f-]{36}\\.webp$`));
    expect(isOwnPhotoPath(path, USER)).toBe(true);
    expect(isOwnPhotoPath(path, OTHER)).toBe(false);
  });

  it.each([
    `${USER}/${FILE}.gif`,
    `${USER}/../${OTHER}/${FILE}.jpg`,
    `${USER}/${FILE}.jpg/extra`,
    `${FILE}.jpg`,
    `${USER}/not-a-uuid.jpg`,
  ])('형식이 다른 경로는 거부: %s', (path) => {
    expect(isOwnPhotoPath(path, USER)).toBe(false);
  });
});

describe('PhotoStorage', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('업로드 URL: service role 키로 서명을 받고 전체 주소로 돌려준다', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        json(200, { url: '/object/upload/sign/review-photos/p.jpg?token=t' }),
      );
    vi.stubGlobal('fetch', fetchMock);
    await expect(storage().createUploadUrl('p.jpg')).resolves.toBe(
      'https://abcd.supabase.co/storage/v1/object/upload/sign/review-photos/p.jpg?token=t',
    );
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      'https://abcd.supabase.co/storage/v1/object/upload/sign/review-photos/p.jpg',
    );
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer service-key');
  });

  it('키가 없으면 503 SERVICE_MISCONFIGURED, Storage를 부르지 않는다', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(storage(null).createUploadUrl('p.jpg')).rejects.toMatchObject({
      code: 'SERVICE_MISCONFIGURED',
      status: 503,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('파일 정보: 있으면 크기·형식, 없으면(400/404) null, 그 밖의 실패는 502', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        json(200, { size: 1234, content_type: 'image/png' }),
      )
      .mockResolvedValueOnce(json(400, { error: 'not found' }))
      .mockResolvedValueOnce(json(500, {}));
    vi.stubGlobal('fetch', fetchMock);
    const s = storage();
    await expect(s.info('a.png')).resolves.toEqual({
      size: 1234,
      contentType: 'image/png',
    });
    await expect(s.info('b.png')).resolves.toBeNull();
    await expect(s.info('c.png')).rejects.toMatchObject({
      code: 'STORAGE_UNAVAILABLE',
      status: 502,
    });
  });

  it('읽기 URL: 한 번에 서명하고, 실패한 경로는 빼고, 오류가 나도 빈 결과', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        json(200, [
          {
            path: 'a.jpg',
            signedURL: '/object/sign/review-photos/a.jpg?token=1',
            error: null,
          },
          { path: 'b.jpg', signedURL: null, error: 'missing' },
        ]),
      )
      .mockRejectedValueOnce(new Error('network'));
    vi.stubGlobal('fetch', fetchMock);
    const s = storage();
    const urls = await s.signedUrls(['a.jpg', 'b.jpg', 'a.jpg']);
    expect([...urls]).toEqual([
      [
        'a.jpg',
        'https://abcd.supabase.co/storage/v1/object/sign/review-photos/a.jpg?token=1',
      ],
    ]);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      expiresIn: 3600,
      paths: ['a.jpg', 'b.jpg'],
    });
    await expect(s.signedUrls(['a.jpg'])).resolves.toEqual(new Map());
  });

  it('삭제 실패는 던지지 않는다(리뷰 처리를 막지 않음)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(500, {})));
    await expect(storage().remove(['a.jpg'])).resolves.toBeUndefined();
  });
});
