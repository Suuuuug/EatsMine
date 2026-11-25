import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { randomInt } from 'node:crypto';
import type { AuthUser } from '../auth/auth-user.js';
import { AppException } from '../common/app-exception.js';
import { profiles, shareLinks } from '../db/schema.js';
import { ProfilesService } from '../profiles/profiles.service.js';
import { rankLabel } from '../profiles/ranks.js';
import { MeRecordsService } from '../reviews/me-records.service.js';

export const SHARE_TYPES = ['territory', 'collection'] as const;
export type ShareType = (typeof SHARE_TYPES)[number];

const ID_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const ID_LENGTH = 10;

/** 추측할 수 없는 공유 링크 ID (영문 대소문자·숫자 10자, 약 59비트) */
export function generateShareId(): string {
  let id = '';
  for (let i = 0; i < ID_LENGTH; i++)
    id += ID_ALPHABET[randomInt(ID_ALPHABET.length)];
  return id;
}

export type ShareLinkDto = { id: string; type: ShareType; createdAt: string };

/** GET /me/shares — 종류별 현재 공유 링크 (꺼져 있으면 null) */
export type MySharesDto = Record<ShareType, ShareLinkDto | null>;

/**
 * 공유 화면 데이터 (D9: 열 때마다 실시간).
 * 노출: 닉네임·등급·색칠된 지역 코드/모은 음식·칸 수 / 비노출: 리뷰 내용·방문 날짜·매장명·프로필 사진
 */
export type SharedViewDto =
  | {
      type: 'territory';
      nickname: string;
      rank: string;
      rankLabel: string;
      count: number;
      total: number;
      regionCodes: string[];
    }
  | {
      type: 'collection';
      nickname: string;
      rank: string;
      rankLabel: string;
      count: number;
      total: number;
      foods: { id: number; name: string; imageUrl: string | null }[];
    };

@Injectable()
export class SharesService {
  constructor(
    @InjectDrizzle() private readonly db: NodePgDatabase,
    private readonly profiles: ProfilesService,
    private readonly records: MeRecordsService,
  ) {}

  /** 공유 링크 만들기. 이미 있으면 같은 링크를 돌려준다 */
  async create(user: AuthUser, type: ShareType): Promise<ShareLinkDto> {
    await this.profiles.getOrCreate(user); // share_links.user_id FK
    // ID 충돌은 사실상 없지만, 만에 하나 겹치면 다시 만든다
    for (let attempt = 0; attempt < 3; attempt++) {
      const existing = await this.find(user.id, type);
      if (existing) return existing;
      const inserted = await this.db
        .insert(shareLinks)
        .values({ id: generateShareId(), userId: user.id, shareType: type })
        .onConflictDoNothing()
        .returning();
      if (inserted[0]) return toLinkDto(inserted[0]);
    }
    const existing = await this.find(user.id, type);
    if (existing) return existing;
    throw new Error('공유 링크를 만들지 못했습니다');
  }

  /** 공유 취소 (링크 무효). 없어도 성공으로 본다 */
  /** 내 공유 상태. 읽기 전용이라 프로필을 만들지 않는다 */
  async listMine(userId: string): Promise<MySharesDto> {
    const rows = await this.db
      .select()
      .from(shareLinks)
      .where(eq(shareLinks.userId, userId));
    return toMySharesDto(rows);
  }

  async remove(userId: string, type: ShareType): Promise<void> {
    await this.db
      .delete(shareLinks)
      .where(
        and(eq(shareLinks.userId, userId), eq(shareLinks.shareType, type)),
      );
  }

  /** 공유 화면 (로그인 불필요) */
  async view(id: string): Promise<SharedViewDto> {
    const [link] = await this.db
      .select({
        userId: shareLinks.userId,
        type: shareLinks.shareType,
        nickname: profiles.nickname,
        rank: profiles.rank,
      })
      .from(shareLinks)
      .innerJoin(profiles, eq(profiles.id, shareLinks.userId))
      .where(eq(shareLinks.id, id))
      .limit(1);
    if (!link) {
      throw new AppException(
        'NOT_FOUND',
        '공유가 취소됐거나 없는 링크예요.',
        HttpStatus.NOT_FOUND,
      );
    }
    const owner = {
      nickname: link.nickname,
      rank: link.rank,
      rankLabel: rankLabel(link.rank),
    };

    if (link.type === 'territory') {
      const t = await this.records.territories(link.userId);
      return {
        type: 'territory',
        ...owner,
        count: t.count,
        total: t.total,
        regionCodes: t.items.map((i) => i.regionCode),
      };
    }
    const c = await this.records.collection(link.userId);
    return {
      type: 'collection',
      ...owner,
      count: c.count,
      total: c.total,
      foods: c.items.map((i) => ({
        id: i.foodId,
        name: i.foodName,
        imageUrl: i.imageUrl,
      })),
    };
  }

  private async find(
    userId: string,
    type: ShareType,
  ): Promise<ShareLinkDto | null> {
    const [row] = await this.db
      .select()
      .from(shareLinks)
      .where(and(eq(shareLinks.userId, userId), eq(shareLinks.shareType, type)))
      .limit(1);
    return row ? toLinkDto(row) : null;
  }
}

function toLinkDto(row: {
  id: string;
  shareType: ShareType;
  createdAt: Date;
}): ShareLinkDto {
  return {
    id: row.id,
    type: row.shareType,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toMySharesDto(
  rows: { id: string; shareType: ShareType; createdAt: Date }[],
): MySharesDto {
  const result: MySharesDto = { territory: null, collection: null };
  for (const row of rows) result[row.shareType] = toLinkDto(row);
  return result;
}
