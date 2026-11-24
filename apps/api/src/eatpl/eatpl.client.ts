import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppException } from '../common/app-exception.js';
import type { Env } from '../config/env.js';
import { normalizeEatplItem } from './eatpl.normalizer.js';
import type {
  EatplPlace,
  EatplRawItem,
  EatplSearchParams,
} from './eatpl.types.js';

const SEARCH_PATH = '/v1/bccard-eatpl/search';
const UNAVAILABLE_MESSAGE =
  '잇플 데이터를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.';

/**
 * 잇플 검색 (D3). k-skill 프록시 응답({ items })과 공식 API 응답({ rspCode, data }) 모두 처리한다.
 * 원본 필드는 이 모듈 안에서만 다루고, 밖으로는 EatplPlace만 내보낸다.
 */
@Injectable()
export class EatplClient {
  private readonly logger = new Logger(EatplClient.name);
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(config: ConfigService<Env, true>) {
    this.baseUrl = config
      .get('EATPL_BASE_URL', { infer: true })
      .replace(/\/+$/, '');
    this.timeoutMs = config.get('EATPL_TIMEOUT_MS', { infer: true });
  }

  /** 매출 순위순 최대 100건. 상세 링크가 없는 매장은 제외된다. */
  async search(params: EatplSearchParams): Promise<EatplPlace[]> {
    const url = new URL(this.baseUrl + SEARCH_PATH);
    if (params.location) url.searchParams.set('location', params.location);
    if (params.genre) url.searchParams.set('merTpbuzNm', params.genre);
    if (params.merchantName) url.searchParams.set('merNm', params.merchantName);
    if ([...url.searchParams.keys()].length === 0) {
      throw new Error(
        'EatplClient.search: location, genre, merchantName 중 하나 이상 필요',
      );
    }

    let res: Response;
    try {
      res = await fetch(url, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (e) {
      this.logger.warn(
        `잇플 호출 실패: ${(e as Error).name} ${(e as Error).message}`,
      );
      throw new AppException(
        'EATPL_UNAVAILABLE',
        UNAVAILABLE_MESSAGE,
        HttpStatus.BAD_GATEWAY,
      );
    }

    if (res.status === HttpStatus.SERVICE_UNAVAILABLE) {
      this.logger.error(
        '잇플 프록시 503 — 프록시 설정(기관코드·릴레이 토큰) 문제',
      );
      throw new AppException(
        'SERVICE_MISCONFIGURED',
        '잇플 연동 설정에 문제가 있어요. 잠시 후 다시 시도해 주세요.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    if (!res.ok) {
      this.logger.warn(`잇플 응답 오류: HTTP ${res.status}`);
      throw new AppException(
        'EATPL_UNAVAILABLE',
        UNAVAILABLE_MESSAGE,
        HttpStatus.BAD_GATEWAY,
      );
    }

    let body: { items?: unknown; data?: unknown; rspCode?: unknown };
    try {
      body = (await res.json()) as typeof body;
    } catch {
      this.logger.warn('잇플 응답이 JSON이 아님');
      throw new AppException(
        'EATPL_UNAVAILABLE',
        UNAVAILABLE_MESSAGE,
        HttpStatus.BAD_GATEWAY,
      );
    }

    if (body.rspCode !== undefined && body.rspCode !== '00000') {
      this.logger.warn(`잇플 응답 코드 오류: ${JSON.stringify(body.rspCode)}`);
      throw new AppException(
        'EATPL_UNAVAILABLE',
        UNAVAILABLE_MESSAGE,
        HttpStatus.BAD_GATEWAY,
      );
    }

    const items = body.items ?? body.data ?? [];
    if (!Array.isArray(items)) {
      this.logger.warn('잇플 응답 형식 오류: 결과 배열 없음');
      throw new AppException(
        'EATPL_UNAVAILABLE',
        UNAVAILABLE_MESSAGE,
        HttpStatus.BAD_GATEWAY,
      );
    }

    return (items as EatplRawItem[]).flatMap(
      (raw) => normalizeEatplItem(raw) ?? [],
    );
  }
}
