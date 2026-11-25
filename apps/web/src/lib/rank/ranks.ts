// 도감 랭크 5단계(프론트 임시 기준).
// 주의: 백엔드(apps/api/src/profiles/ranks.ts)는 rookie/local/conqueror/master 4등급(0/3/10/30)이다.
// 단계 수와 이름이 달라 팀 확정이 필요하다. 확정 전까지 이 값은 화면용 임시 값이다.

export type RankId = "bronze" | "silver" | "gold" | "platinum" | "diamond";

export interface Rank {
  id: RankId;
  name: string;
  /** 이 랭크가 시작되는 리뷰 개수 */
  min: number;
  src: string;
}

export const RANKS: readonly Rank[] = [
  { id: "bronze", name: "브론즈", min: 0, src: "/images/ranks/bronze.svg" },
  { id: "silver", name: "실버", min: 3, src: "/images/ranks/silver.svg" },
  { id: "gold", name: "골드", min: 10, src: "/images/ranks/gold.svg" },
  { id: "platinum", name: "플래티넘", min: 30, src: "/images/ranks/platinum.svg" },
  { id: "diamond", name: "다이아", min: 60, src: "/images/ranks/diamond.svg" },
];

export interface RankProgress {
  current: Rank;
  next: Rank | null;
  /** 다음 랭크까지 남은 리뷰 수. 최고 랭크는 0 */
  remaining: number;
  /** 현재 랭크 구간 안의 진행 비율 0~1. 최고 랭크는 1 */
  ratio: number;
}

function normalize(reviewCount: number): number {
  return Number.isFinite(reviewCount) && reviewCount > 0 ? Math.floor(reviewCount) : 0;
}

export function rankOf(reviewCount: number): Rank {
  const n = normalize(reviewCount);
  let found = RANKS[0];
  for (const r of RANKS) if (n >= r.min) found = r;
  return found;
}

export function nextRank(id: RankId): Rank | null {
  const i = RANKS.findIndex((r) => r.id === id);
  return i >= 0 && i < RANKS.length - 1 ? RANKS[i + 1] : null;
}

export function progress(reviewCount: number): RankProgress {
  const n = normalize(reviewCount);
  const current = rankOf(n);
  const next = nextRank(current.id);
  if (!next) return { current, next: null, remaining: 0, ratio: 1 };
  return {
    current,
    next,
    remaining: next.min - n,
    ratio: (n - current.min) / (next.min - current.min),
  };
}
