import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { assignOwnerSlots, OWNER_SLOT_COUNT } from './owner-colors.ts';

const adjacency = JSON.parse(readFileSync(new URL('../../data/region-adjacency.json', import.meta.url), 'utf8'));
const codes = Object.keys(adjacency);

function ownersOf(slots, owners) {
  const map = new Map();
  for (const [code, slot] of Object.entries(slots)) {
    if (slot == null) continue;
    map.set(owners[code], slot);
  }
  return map;
}
function conflicts(slots, owners) {
  let n = 0;
  for (const [a, list] of Object.entries(adjacency)) for (const b of list) {
    if (a < b && owners[a] != null && owners[b] != null && owners[a] !== owners[b] && slots[a] === slots[b]) n++;
  }
  return n;
}
// 결정적 의사 난수(테스트용)
function lcg(seed) { let s = seed; return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296; }
function randomOwners(count, seed, filter = (c) => c.length === 5) {
  const rnd = lcg(seed);
  return Object.fromEntries(codes.filter(filter).map((c) => [c, rnd() < 0.15 ? null : `u${Math.floor(rnd() * count)}`]));
}

// 시도 단위로 묶인(지역이 모여 있는) 소유자. 실제 지도처럼 한 사용자의 영토가 이어진 경우.
function clusteredOwners(count, filter = (c) => c.length === 5) {
  const sidos = codes.filter((c) => c.length === 2);
  return Object.fromEntries(codes.filter(filter).map((c) => [c, `u${sidos.indexOf(c.slice(0, 2)) % count}`]));
}

test('(a) 같은 ownerId는 한 화면에서 항상 같은 슬롯, 소유자 없음은 null', () => {
  const owners = { 11110: 'a', 11140: 'b', 11170: 'a', 11200: null, 11230: 'a' };
  const { slots, reused } = assignOwnerSlots(owners, adjacency);
  assert.equal(slots['11110'], slots['11170']);
  assert.equal(slots['11110'], slots['11230']);
  assert.equal(slots['11200'], null);
  assert.equal(reused, false);
  assert.deepEqual(assignOwnerSlots(owners, adjacency), assignOwnerSlots(owners, adjacency));
});

test('(b) 8명 이하면 인접 여부와 무관하게 모두 서로 다른 슬롯', () => {
  const owners = randomOwners(8, 7);
  const { slots, reused } = assignOwnerSlots(owners, adjacency);
  const byOwner = ownersOf(slots, owners);
  assert.ok(byOwner.size <= 8);
  assert.equal(new Set(byOwner.values()).size, byOwner.size);
  for (const v of byOwner.values()) assert.ok(v >= 1 && v <= OWNER_SLOT_COUNT);
  assert.equal(reused, false);
  // 서로 멀리 떨어진 두 사용자도 다른 슬롯
  const far = assignOwnerSlots({ 11110: 'x', 50110: 'y' }, adjacency).slots;
  assert.notEqual(far['11110'], far['50110']);
});

test('(c) 9명 이상이면 reused=true, 같은 슬롯 재사용은 인접하지 않은 지역끼리만', () => {
  for (const count of [9, 12, 16]) {
    const owners = clusteredOwners(count);
    const { slots, reused } = assignOwnerSlots(owners, adjacency);
    assert.equal(reused, true);
    assert.equal(conflicts(slots, owners), 0, `${count}명`);
    // 같은 사용자 = 같은 슬롯
    const seen = new Map();
    for (const [c, o] of Object.entries(owners)) {
      if (o == null) continue;
      if (seen.has(o)) assert.equal(slots[c], seen.get(o)); else seen.set(o, slots[c]);
    }
  }
});

test('본인(meId)은 가능하면 항상 슬롯 1', () => {
  const small = assignOwnerSlots({ 11110: 'a', 11140: 'me', 11170: 'c' }, adjacency, { meId: 'me' });
  assert.equal(small.slots['11140'], 1);
  const owners = clusteredOwners(15);
  owners['11110'] = 'me';
  const big = assignOwnerSlots(owners, adjacency, { meId: 'me' });
  assert.equal(big.slots['11110'], 1);
  for (const [c, o] of Object.entries(owners)) if (o !== 'me' && o != null) assert.notEqual(big.slots[c], 1);
});

test('실제 시도 데이터에서 인접 충돌 0건 (사용자 16명, 시도마다 다른 사용자)', () => {
  const owners = clusteredOwners(16, (c) => c.length === 2);
  const { slots } = assignOwnerSlots(owners, adjacency);
  assert.equal(conflicts(slots, owners), 0);
});

test('흩어진 소유자 30명이어도 같은 사용자=같은 슬롯, 모든 지역에 슬롯 부여', () => {
  const owners = randomOwners(30, 11);
  const { slots, reused } = assignOwnerSlots(owners, adjacency);
  assert.equal(reused, true);
  for (const [c, o] of Object.entries(owners)) assert.equal(slots[c] === null, o === null);
});

test('같은 입력은 입력 키 순서와 무관하게 같은 출력', () => {
  const owners = randomOwners(12, 5);
  const shuffled = Object.fromEntries(Object.entries(owners).reverse());
  assert.deepEqual(assignOwnerSlots(owners, adjacency).slots, assignOwnerSlots(shuffled, adjacency).slots);
});
