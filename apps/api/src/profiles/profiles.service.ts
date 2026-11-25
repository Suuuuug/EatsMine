import { Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { count, eq, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { randomInt } from 'node:crypto';
import type { AuthUser } from '../auth/auth-user.js';
import { type Profile, profiles, reviews } from '../db/schema.js';
import { rankLabel } from './ranks.js';

export type ProfileDto = {
  id: string;
  nickname: string;
  rank: Profile['rank'];
  rankLabel: string;
  avatarUrl: string | null;
  /** 내 리뷰 총 개수(공개·비공개 모두). 등급 계산 기준과 같다 */
  reviewCount: number;
  createdAt: string;
};

/** 가입 시 자동 닉네임 (실명 미사용, 중복 허용) */
export function generateNickname(): string {
  return `미식탐험가${randomInt(1000, 10000)}`;
}

export function toProfileDto(p: Profile, reviewCount: number): ProfileDto {
  return {
    id: p.id,
    nickname: p.nickname,
    rank: p.rank,
    rankLabel: rankLabel(p.rank),
    avatarUrl: p.avatarUrl,
    reviewCount,
    createdAt: p.createdAt.toISOString(),
  };
}

@Injectable()
export class ProfilesService {
  constructor(@InjectDrizzle() private readonly db: NodePgDatabase) {}

  /** 내 프로필. 없으면 이때 만든다 (D6: 첫 api 요청 시 생성). 동시 요청에도 한 번만 생성된다. */
  async getOrCreate(user: AuthUser): Promise<Profile> {
    await this.db
      .insert(profiles)
      .values({
        id: user.id,
        nickname: generateNickname(),
        avatarUrl: user.avatarUrl,
      })
      .onConflictDoNothing({ target: profiles.id });
    const [profile] = await this.db
      .select()
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1);
    return profile;
  }

  async countReviews(userId: string): Promise<number> {
    const [row] = await this.db
      .select({ n: count() })
      .from(reviews)
      .where(eq(reviews.userId, userId));
    return Number(row?.n ?? 0);
  }

  async updateNickname(user: AuthUser, nickname: string): Promise<Profile> {
    await this.getOrCreate(user);
    const [profile] = await this.db
      .update(profiles)
      .set({ nickname, updatedAt: sql`now()` })
      .where(eq(profiles.id, user.id))
      .returning();
    return profile;
  }
}
