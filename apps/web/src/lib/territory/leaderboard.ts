import type { TerritoryOwner } from "@/types/territory";

export interface LeaderboardRow {
  rank: number;
  ownerId: string;
  nickname: string;
  reviewCount: number;
  isMe: boolean;
}

export interface MyStanding {
  rank: number;
  /** 1위를 넘어서는 데 필요한 리뷰 수. 이미 1위면 0 */
  toFirst: number;
}

/** 지역 1위와 2·3위를 순위 번호가 붙은 행으로 바꾼다. 리뷰 많은 순으로 정렬한다. */
export function buildLeaderboard(owner: TerritoryOwner | null, meId: string): LeaderboardRow[] {
  if (!owner) return [];
  const first = { ownerId: owner.ownerId, nickname: owner.nickname, reviewCount: owner.reviewCount };
  const sorted = [first, ...(owner.top ?? [])].sort((a, b) => b.reviewCount - a.reviewCount);
  return sorted.map((c, i) => ({
    rank: i + 1,
    ownerId: c.ownerId,
    nickname: c.nickname,
    reviewCount: c.reviewCount,
    isMe: c.ownerId === meId,
  }));
}

/** 내가 행에 있을 때만 순위와 1위까지 남은 개수를 돌려준다. */
export function myStanding(rows: readonly LeaderboardRow[]): MyStanding | null {
  const me = rows.find((r) => r.isMe);
  if (!me) return null;
  if (me.rank === 1) return { rank: 1, toFirst: 0 };
  return { rank: me.rank, toFirst: rows[0].reviewCount - me.reviewCount + 1 };
}

export function standingMessage(s: MyStanding | null): string | null {
  if (!s) return null;
  if (s.rank === 1) return "내가 이 영토의 주인이에요";
  return `이 지역에서 ${s.rank}위예요. 주인까지 리뷰 ${s.toFirst}개 남았어요.`;
}
