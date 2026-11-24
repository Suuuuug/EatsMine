/** 등급 키 (DB profiles.rank 값). 순서 = 낮은 등급 → 높은 등급 */
export const RANK_KEYS = ['rookie', 'local', 'conqueror', 'master'] as const;

export type RankKey = (typeof RANK_KEYS)[number];

/** 등급 구간과 표시 이름 (D6). 구간·이름을 바꿔도 DB는 고칠 필요 없음 */
export const RANKS: readonly {
  key: RankKey;
  minReviews: number;
  label: string;
}[] = [
  { key: 'rookie', minReviews: 0, label: '새내기 탐험가' },
  { key: 'local', minReviews: 3, label: '동네 미식가' },
  { key: 'conqueror', minReviews: 10, label: '지역 정복자' },
  { key: 'master', minReviews: 30, label: '전국 미식왕' },
];

/** 리뷰 수 → 등급 (8단계 리뷰 흐름에서 사용) */
export function rankForReviewCount(count: number): RankKey {
  let result: RankKey = 'rookie';
  for (const rank of RANKS) if (count >= rank.minReviews) result = rank.key;
  return result;
}

export function rankLabel(key: RankKey): string {
  return RANKS.find((r) => r.key === key)?.label ?? RANKS[0].label;
}
