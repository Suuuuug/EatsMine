import { Injectable, Logger } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { regions } from '../db/schema.js';

type RegionRow = {
  code: string;
  parentCode: string | null;
  level: 'sido' | 'sigungu';
  name: string;
  addressAliases: string[] | null;
};

/** 세종은 하위 시·군·구가 없어 시·도만 맞으면 이 코드 */
const SEJONG_SIDO = '36';

/**
 * 주소 첫 두 단어(시·도, 시·군·구)로 지역 코드를 찾는 함수를 만든다.
 * 예) "경기 수원시 영통구 매영로 150" → 41110, "광주 서구 …" → 12240, "세종특별자치시 한누리대로 …" → 36110
 */
export function buildAddressMatcher(
  rows: RegionRow[],
): (address: string) => string | null {
  const sidoByAlias = new Map<string, string>();
  const sigunguByKey = new Map<string, string>();
  const sigunguBySido = new Map<string, string[]>();

  for (const r of rows) {
    if (r.level === 'sido') {
      for (const alias of [r.name, ...(r.addressAliases ?? [])])
        sidoByAlias.set(alias, r.code);
    } else if (r.parentCode) {
      sigunguByKey.set(`${r.parentCode}:${r.name}`, r.code);
      sigunguBySido.set(r.parentCode, [
        ...(sigunguBySido.get(r.parentCode) ?? []),
        r.code,
      ]);
    }
  }

  return (address: string) => {
    const [sidoToken, sigunguToken] = address.trim().split(/\s+/);
    const sidoCode = sidoToken ? sidoByAlias.get(sidoToken) : undefined;
    if (!sidoCode) return null;
    if (sidoCode === SEJONG_SIDO)
      return sigunguBySido.get(SEJONG_SIDO)?.[0] ?? null;
    return sigunguToken
      ? (sigunguByKey.get(`${sidoCode}:${sigunguToken}`) ?? null)
      : null;
  };
}

/** regions 테이블로 만든 주소 매처. 지역 데이터는 거의 바뀌지 않으므로 인스턴스당 한 번만 읽는다. */
@Injectable()
export class AddressMatcher {
  private readonly logger = new Logger(AddressMatcher.name);
  private matcher: Promise<(address: string) => string | null> | null = null;

  constructor(@InjectDrizzle() private readonly db: NodePgDatabase) {}

  async match(address: string): Promise<string | null> {
    return (await this.load())(address);
  }

  private load() {
    this.matcher ??= this.db
      .select({
        code: regions.code,
        parentCode: regions.parentCode,
        level: regions.level,
        name: regions.name,
        addressAliases: regions.addressAliases,
      })
      .from(regions)
      .then(buildAddressMatcher)
      .catch((e: unknown) => {
        this.matcher = null; // 실패하면 다음 요청에서 다시 시도
        this.logger.error(`지역 데이터 로드 실패: ${(e as Error).message}`);
        throw e;
      });
    return this.matcher;
  }
}
