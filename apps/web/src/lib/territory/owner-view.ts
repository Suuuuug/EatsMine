// 영토 1위 화면용 순수 로직: 지역→소유자 맵, 슬롯 배정, 범례 정렬, 내 순위.
import { assignOwnerSlots, type Adjacency, type OwnerSlot } from "./owner-colors.ts";
import type { TerritoryContender, TerritoryOwner } from "../../types/territory.ts";

export type OwnerView = {
  ownerByRegion: Record<string, TerritoryOwner | null>;
  slots: Record<string, OwnerSlot | null>;
  ownerSlots: Record<string, OwnerSlot>;
  reused: boolean;
  /** 8색을 넘어 이미 쓰인 색을 이어서 쓰는 사용자(빗금을 덧입힌다) */
  sharedSlotOwners: Set<string>;
};

export type LegendRow = { regionCode: string; owner: TerritoryOwner | null; slot: OwnerSlot | null };

export type FixedOwnerSlots = Pick<OwnerView, "ownerSlots" | "sharedSlotOwners" | "reused">;

function sharedOf(ownerSlots: Record<string, OwnerSlot>): Set<string> {
  // 슬롯은 배정 순서대로 들어 있다. 같은 슬롯을 처음 쓴 사람은 단색, 이어서 나눠 쓰는 사람만 빗금을 덧입힌다.
  const firstHolder = new Set<number>();
  const shared = new Set<string>();
  for (const [id, slot] of Object.entries(ownerSlots)) {
    if (firstHolder.has(slot)) shared.add(id); else firstHolder.add(slot);
  }
  return shared;
}

/** 모든 화면이 쓸 슬롯을 한 번만 배정한다(전체 시도·시군구 소유자 기준). 같은 사용자는 어느 화면에서나 같은 색. */
export function fixOwnerSlots(owners: readonly TerritoryOwner[], adjacency: Adjacency, meId: string | null): FixedOwnerSlots {
  const ids: Record<string, string | null> = {};
  for (const o of owners) ids[o.regionCode] = o.ownerId;
  const { ownerSlots, reused } = assignOwnerSlots(ids, adjacency, { meId });
  return { ownerSlots, reused, sharedSlotOwners: sharedOf(ownerSlots) };
}

export function buildOwnerView(
  codes: readonly string[],
  lookup: (code: string) => TerritoryOwner | null,
  adjacency: Adjacency,
  meId: string | null,
  fixed?: FixedOwnerSlots,
): OwnerView {
  const ownerByRegion: Record<string, TerritoryOwner | null> = {};
  const ids: Record<string, string | null> = {};
  for (const code of codes) {
    const found = lookup(code);
    ownerByRegion[code] = found;
    ids[code] = found?.ownerId ?? null;
  }
  const local = assignOwnerSlots(ids, adjacency, { meId });
  if (!fixed) return { ownerByRegion, slots: local.slots, ownerSlots: local.ownerSlots, reused: local.reused, sharedSlotOwners: sharedOf(local.ownerSlots) };
  const slots: Record<string, OwnerSlot | null> = {};
  for (const code of codes) {
    const id = ids[code];
    slots[code] = id == null ? null : fixed.ownerSlots[id] ?? local.ownerSlots[id];
  }
  return { ownerByRegion, slots, ownerSlots: fixed.ownerSlots, reused: fixed.reused, sharedSlotOwners: fixed.sharedSlotOwners };
}

/** 리뷰 수 내림차순, 같으면 닉네임 가나다순, 1위 없는 지역은 마지막(코드순). */
export function legendRows(codes: readonly string[], view: OwnerView): LegendRow[] {
  const rows = codes.map((regionCode) => ({ regionCode, owner: view.ownerByRegion[regionCode] ?? null, slot: view.slots[regionCode] ?? null }));
  return rows.sort((a, b) => {
    if (!a.owner || !b.owner) return a.owner ? -1 : b.owner ? 1 : a.regionCode.localeCompare(b.regionCode);
    return b.owner.reviewCount - a.owner.reviewCount || a.owner.nickname.localeCompare(b.owner.nickname, "ko") || a.regionCode.localeCompare(b.regionCode);
  });
}

/** 선택한 지역에서 내 순위(1~3). 상위 3위에 없으면 null. */
export function myRank(owner: TerritoryOwner | null, meId: string | null): { rank: 1 | 2 | 3; reviewCount: number } | null {
  if (!owner || !meId) return null;
  if (owner.ownerId === meId) return { rank: 1, reviewCount: owner.reviewCount };
  const index = (owner.top ?? []).findIndex((c) => c.ownerId === meId);
  if (index < 0 || index > 1) return null;
  return { rank: (index + 2) as 2 | 3, reviewCount: owner.top![index].reviewCount };
}

export type ScopeSummary = { totalReviews: number; topPerson: TerritoryContender | null };

/** 범위 안 모든 후보(1~3위)의 리뷰 수 합계와, 사용자별 합계가 가장 큰 사람. 동점은 닉네임 가나다순. */
export function summarizeScope(owners: readonly (TerritoryOwner | null)[]): ScopeSummary {
  let totalReviews = 0;
  const people = new Map<string, TerritoryContender>();
  for (const owner of owners) {
    if (!owner) continue;
    for (const c of [owner, ...(owner.top ?? [])]) {
      totalReviews += c.reviewCount;
      const prev = people.get(c.ownerId);
      people.set(c.ownerId, { ownerId: c.ownerId, nickname: c.nickname, reviewCount: (prev?.reviewCount ?? 0) + c.reviewCount });
    }
  }
  const best = [...people.values()].sort((a, b) => b.reviewCount - a.reviewCount || a.nickname.localeCompare(b.nickname, "ko") || a.ownerId.localeCompare(b.ownerId))[0];
  return { totalReviews, topPerson: best ?? null };
}
