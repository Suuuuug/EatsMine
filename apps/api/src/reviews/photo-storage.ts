import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { AppException } from '../common/app-exception.js';
import type { Env } from '../config/env.js';

/*
 * 리뷰 사진 저장소: Supabase Storage 비공개 버킷(REST API를 직접 부른다, 추가 의존성 없음).
 * - 업로드: api가 서명된 업로드 URL을 발급하고, 브라우저가 그 URL로 파일을 직접 올린다(api 요청 크기 제한 회피).
 * - 읽기: 공개 버킷이 아니라서 볼 때마다 짧게 유효한 서명 URL을 만들어 준다.
 * - 경로: {userId}/{uuid}.{확장자} — 리뷰에 붙일 때 본인 폴더인지 확인한다.
 * 버킷 정책(Policy)은 두지 않는다. 브라우저 anon 키로는 아무것도 할 수 없고, api만 service role 키로 다룬다.
 */

export const PHOTO_CONTENT_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const;
export type PhotoContentType = keyof typeof PHOTO_CONTENT_TYPES;

/** 버킷 설정(5MB)과 같게 api에서도 미리 거른다 */
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
/** 서명된 읽기 URL 유효 시간(초) */
export const PHOTO_URL_TTL_SECONDS = 60 * 60;

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const PATH_RE = new RegExp(`^(${UUID})/(${UUID})\\.(jpg|png|webp)$`);

/** 경로가 우리 형식({userId}/{uuid}.확장자)이고 이 사용자 폴더인지 */
export function isOwnPhotoPath(path: string, userId: string): boolean {
  const m = PATH_RE.exec(path);
  return !!m && m[1] === userId.toLowerCase();
}

export function newPhotoPath(userId: string, contentType: PhotoContentType) {
  return `${userId.toLowerCase()}/${randomUUID()}.${PHOTO_CONTENT_TYPES[contentType]}`;
}

@Injectable()
export class PhotoStorage {
  private readonly logger = new Logger(PhotoStorage.name);
  private readonly base: string;
  private readonly bucket: string;
  private readonly key: string | undefined;

  constructor(config: ConfigService<Env, true>) {
    this.base = `${config.get('SUPABASE_URL', { infer: true })}/storage/v1`;
    this.bucket = config.get('REVIEW_PHOTO_BUCKET', { infer: true });
    this.key = config.get('SUPABASE_SERVICE_ROLE_KEY', { infer: true });
  }

  get configured(): boolean {
    return !!this.key;
  }

  /** 서명된 업로드 URL(브라우저가 PUT으로 파일을 올린다, Supabase 기본 2시간 유효) */
  async createUploadUrl(path: string): Promise<string> {
    const body = await this.request<{ url?: string }>(
      'POST',
      `/object/upload/sign/${this.bucket}/${path}`,
      {},
    );
    if (!body?.url) throw unavailable();
    return `${this.base}${body.url}`;
  }

  /** 올라간 파일 정보. 없으면 null */
  async info(
    path: string,
  ): Promise<{ size: number; contentType: string } | null> {
    const res = await this.fetch('GET', `/object/info/${this.bucket}/${path}`);
    // 없는 파일은 Storage가 400 또는 404로 답한다
    if (res.status === 400 || res.status === 404) return null;
    if (!res.ok) throw unavailable(`info ${res.status}`, this.logger);
    const j = (await res.json()) as { size?: number; content_type?: string };
    return {
      size: Number(j.size ?? 0),
      contentType: String(j.content_type ?? ''),
    };
  }

  /** 여러 경로의 서명된 읽기 URL. 실패한 경로는 결과에 없다 */
  async signedUrls(paths: readonly string[]): Promise<Map<string, string>> {
    const unique = [...new Set(paths)];
    const result = new Map<string, string>();
    if (!unique.length || !this.key) return result;
    try {
      const rows = await this.request<
        { path: string; signedURL: string | null; error: string | null }[]
      >('POST', `/object/sign/${this.bucket}`, {
        expiresIn: PHOTO_URL_TTL_SECONDS,
        paths: unique,
      });
      for (const row of rows ?? [])
        if (row.signedURL) result.set(row.path, `${this.base}${row.signedURL}`);
    } catch (e) {
      // 사진을 못 불러와도 리뷰 목록은 보여 준다
      this.logger.warn(`사진 URL 서명 실패: ${(e as Error).message}`);
    }
    return result;
  }

  /** 파일 삭제. 실패해도 리뷰 처리는 막지 않는다(남은 파일은 나중에 정리) */
  async remove(paths: readonly string[]): Promise<void> {
    if (!paths.length || !this.key) return;
    try {
      await this.request('DELETE', `/object/${this.bucket}`, {
        prefixes: [...paths],
      });
    } catch (e) {
      this.logger.warn(
        `사진 삭제 실패(${paths.length}개): ${(e as Error).message}`,
      );
    }
  }

  private async request<T>(
    method: string,
    path: string,
    body: unknown,
  ): Promise<T> {
    const res = await this.fetch(method, path, body);
    if (!res.ok)
      throw unavailable(
        `${method} ${path.split('/')[2]} ${res.status}`,
        this.logger,
      );
    return (await res.json()) as T;
  }

  private async fetch(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<Response> {
    if (!this.key) {
      throw new AppException(
        'SERVICE_MISCONFIGURED',
        '사진 저장소가 설정되지 않았어요.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    try {
      return await fetch(`${this.base}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.key}`,
          apikey: this.key,
          ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(8000),
      });
    } catch (e) {
      throw unavailable(`network ${(e as Error).name}`, this.logger);
    }
  }
}

function unavailable(detail?: string, logger?: Logger) {
  if (detail) logger?.warn(`Storage 호출 실패: ${detail}`);
  return new AppException(
    'STORAGE_UNAVAILABLE',
    '사진 저장소에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.',
    HttpStatus.BAD_GATEWAY,
  );
}
