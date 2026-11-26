import type { ApiRankingEntry, NormalizedRegionRanking } from "../dictionary/dictionary-api.ts";

// 내 영토 화면의 순위 문장과 요약 숫자. 순위 자체는 서버(/territories/:code/ranking)가 정하고 여기서는 읽기만 한다.

/** 고른 지역에서 내 위치를 한 문장으로. 순위가 없으면(아무도 공개 리뷰를 안 남김) 1위가 되는 조건을 말한다. */
export function standingLine(ranking: NormalizedRegionRanking): string {
  const leader = ranking.items[0];
  if (!leader) return "공개 리뷰 1개면 1위예요";
  const me = ranking.me;
  if (me?.position === 1) {
    const second = ranking.items.find((item) => item.position === 2);
    return second ? `내가 1위예요. 2위와 ${me.reviewCount - second.reviewCount}개 차이예요` : "내가 1위예요";
  }
  // 동점이면 먼저 도달한 사람이 앞서므로 1위보다 하나 더 써야 앞선다.
  const toFirst = leader.reviewCount - (me?.reviewCount ?? 0) + 1;
  return `1위까지 리뷰 ${toFirst}개 남았어요`;
}

/** 불러온 지역 순위 가운데 내가 1위인 지역 수. 아직 못 불러온 지역(null)은 세지 않는다. */
export function countLeading(rankings: ReadonlyMap<string, NormalizedRegionRanking | null>): number {
  let count = 0;
  for (const ranking of rankings.values()) if (ranking?.me?.position === 1) count += 1;
  return count;
}

const SAMPLE_RIVALS = ["골목대장", "국밥탐정", "면치기장인", "빵지순례자", "회한접시"];
const SAMPLE_ME = "먹깨비";

/** 로그인 전 예시 화면용 순위. 지역 코드로 정해지므로 같은 지역은 늘 같은 값을 보여 준다. */
export function sampleRanking(code: string): NormalizedRegionRanking {
  const seed = [...code].reduce((sum, ch) => sum * 31 + ch.charCodeAt(0), 7);
  const pick = (n: number, mod: number) => Math.abs(Math.floor(seed / (n + 1))) % mod;
  const people = [
    { nickname: SAMPLE_ME, reviewCount: 1 + pick(1, 6), isMe: true },
    ...SAMPLE_RIVALS.slice(0, 3).map((nickname, i) => ({ nickname, reviewCount: 1 + pick(i + 3, 9), isMe: false })),
  ]
    .sort((a, b) => b.reviewCount - a.reviewCount || Number(b.isMe) - Number(a.isMe))
    .map<ApiRankingEntry>((p, i) => ({ ...p, position: i + 1, rank: "rookie", rankLabel: "", avatarUrl: null }));
  const me = people.find((p) => p.isMe) ?? null;
  return {
    windowDays: 30,
    items: people.slice(0, 3),
    me,
    standing: me ? { rank: me.position, toFirst: me.position === 1 ? 0 : people[0].reviewCount - me.reviewCount + 1 } : null,
  };
}
