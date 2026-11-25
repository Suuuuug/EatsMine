/**
 * 지도 지역 리뷰 1위 사용자 → 구분색 슬롯(1..8, tokens.css --color-owner-N, 클래스 fill-owner-N) 배정.
 * - 같은 ownerId는 한 화면에서 항상 같은 슬롯.
 * - 서로 다른 ownerId는 8명 이내면 전부 다른 슬롯(전역 유일).
 * - 9명 이상이면 인접하지 않은 사용자끼리만 슬롯을 재사용하고 reused=true (UI가 패턴 등을 덧입힌다).
 * - 소유자 없음(null)은 null(map-empty).
 * 순수 함수이며 결정적이다(입력 키 순서와 무관).
 */
export const OWNER_SLOT_COUNT = 8;

export type OwnerSlot = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type Adjacency = Record<string, readonly string[]>;
export type OwnerSlotResult = {
  /** 지역 코드 → 슬롯(소유자 없으면 null) */
  slots: Record<string, OwnerSlot | null>;
  /** ownerId → 슬롯 */
  ownerSlots: Record<string, OwnerSlot>;
  /** 8명을 넘어 슬롯을 재사용했는가 */
  reused: boolean;
};

export function assignOwnerSlots(
  ownersByRegion: Record<string, string | null>,
  adjacency: Adjacency,
  options: { meId?: string | null } = {},
): OwnerSlotResult {
  const regionsOf = new Map<string, string[]>();
  for (const code of Object.keys(ownersByRegion).sort()) {
    const owner = ownersByRegion[code];
    if (owner == null) continue;
    regionsOf.set(owner, [...(regionsOf.get(owner) ?? []), code]);
  }

  // 사용자 그래프: 두 사용자의 지역이 하나라도 맞닿으면 이웃
  const neighbors = new Map<string, Set<string>>();
  for (const owner of regionsOf.keys()) neighbors.set(owner, new Set());
  for (const [owner, regions] of regionsOf) {
    for (const code of regions) for (const n of adjacency[code] ?? []) {
      const other = ownersByRegion[n];
      if (other != null && other !== owner) { neighbors.get(owner)!.add(other); neighbors.get(other)?.add(owner); }
    }
  }

  const meId = options.meId != null && regionsOf.has(options.meId) ? options.meId : null;
  // 우선순위: 본인 → 지역 많은 순 → id 사전순 (Welsh-Powell 식 결정적 순서)
  const order = [...regionsOf.keys()].sort((a, b) => {
    if (a === meId) return -1;
    if (b === meId) return 1;
    return regionsOf.get(b)!.length - regionsOf.get(a)!.length || (a < b ? -1 : a > b ? 1 : 0);
  });

  const ownerSlots: Record<string, OwnerSlot> = {};
  const reused = order.length > OWNER_SLOT_COUNT;
  order.forEach((owner, index) => {
    if (index < OWNER_SLOT_COUNT) { ownerSlots[owner] = (index + 1) as OwnerSlot; return; }
    // 재사용: 이웃이 쓰지 않는 슬롯 중 가장 덜 쓰인 것. 본인 슬롯(1)은 가능하면 비워 둔다.
    const used = new Set<number>();
    for (const n of neighbors.get(owner)!) if (ownerSlots[n]) used.add(ownerSlots[n]);
    const count = (slot: number) => Object.values(ownerSlots).filter((s) => s === slot).length;
    const candidates = Array.from({ length: OWNER_SLOT_COUNT }, (_, i) => i + 1).filter((s) => !(meId && s === 1));
    const free = candidates.filter((s) => !used.has(s));
    const pool = free.length > 0 ? free : candidates; // 이웃이 7슬롯 이상이면 충돌이 불가피
    pool.sort((a, b) => count(a) - count(b) || a - b);
    ownerSlots[owner] = pool[0] as OwnerSlot;
  });

  const slots: Record<string, OwnerSlot | null> = {};
  for (const code of Object.keys(ownersByRegion).sort()) {
    const owner = ownersByRegion[code];
    slots[code] = owner == null ? null : ownerSlots[owner];
  }
  return { slots, ownerSlots, reused };
}
