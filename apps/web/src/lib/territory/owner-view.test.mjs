import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { buildOwnerView, fixOwnerSlots, legendRows, myRank, summarizeScope } from './owner-view.ts';
import { getDummyOwner, ME_ID, DUMMY_TERRITORY_OWNERS } from './sample-data.ts';

const adjacency = JSON.parse(readFileSync(new URL('../../data/region-adjacency.json', import.meta.url), 'utf8'));
const owner = (code, ownerId, nickname, reviewCount, isMe = false, top) => ({ regionCode: code, ownerId, nickname, reviewCount, isMe, top });

test('같은 사람이 1위인 지역은 같은 슬롯, 다른 사람은 다른 슬롯', () => {
  const table = { '11': owner('11', 'a', '가', 5), '41': owner('41', 'a', '가', 7), '28': owner('28', 'b', '나', 3) };
  const view = buildOwnerView(['11', '41', '28', '26'], (c) => table[c] ?? null, adjacency, null);
  assert.equal(view.slots['11'], view.slots['41']);
  assert.notEqual(view.slots['11'], view.slots['28']);
  assert.equal(view.slots['26'], null);
  assert.equal(view.ownerByRegion['26'], null);
});

test('내가 1위인 지역이 있으면 내 슬롯은 1번이다', () => {
  const table = { '11': owner('11', 'a', '가', 5), '28': owner('28', ME_ID, '나', 9, true) };
  const view = buildOwnerView(['11', '28'], (c) => table[c] ?? null, adjacency, ME_ID);
  assert.equal(view.slots['28'], 1);
});

test('범례는 리뷰 수 내림차순, 같으면 닉네임 가나다순, 1위 없는 지역은 마지막', () => {
  const table = { '11': owner('11', 'a', '나', 5), '41': owner('41', 'b', '가', 5), '28': owner('28', 'c', '다', 9) };
  const view = buildOwnerView(['11', '41', '28', '26'], (c) => table[c] ?? null, adjacency, null);
  const rows = legendRows(['11', '41', '28', '26'], view);
  assert.deepEqual(rows.map((r) => r.regionCode), ['28', '41', '11', '26']);
  assert.equal(rows[3].owner, null);
  assert.equal(rows[3].slot, null);
});

test('9명 이상이면 슬롯을 나눠 쓰는 사람을 sharedSlotOwners 로 알려 준다', () => {
  const codes = Object.keys(adjacency).filter((c) => c.length === 2);
  const table = Object.fromEntries(codes.map((c, i) => [c, owner(c, `u${i}`, `사람${i}`, 10 + i)]));
  const view = buildOwnerView(codes, (c) => table[c], adjacency, null);
  assert.equal(view.reused, true);
  assert.ok(view.sharedSlotOwners.size >= 2);
  for (const id of view.sharedSlotOwners) {
    const slot = view.ownerSlots[id];
    assert.ok(Object.values(view.ownerSlots).filter((s) => s === slot).length > 1);
  }
});

test('8명 이하면 sharedSlotOwners 는 비어 있다', () => {
  const table = { '11': owner('11', 'a', '가', 5), '41': owner('41', 'b', '나', 7) };
  const view = buildOwnerView(['11', '41'], (c) => table[c] ?? null, adjacency, null);
  assert.equal(view.sharedSlotOwners.size, 0);
});

test('내 순위: 1위, 2·3위, 순위 밖', () => {
  const top = [{ ownerId: 'x', nickname: '엑스', reviewCount: 4 }, { ownerId: ME_ID, nickname: '나', reviewCount: 3 }];
  assert.deepEqual(myRank(owner('11', ME_ID, '나', 9, true, top), ME_ID), { rank: 1, reviewCount: 9 });
  assert.deepEqual(myRank(owner('11', 'a', '가', 9, false, top), ME_ID), { rank: 3, reviewCount: 3 });
  assert.equal(myRank(owner('11', 'a', '가', 9, false, [top[0]]), ME_ID), null);
  assert.equal(myRank(null, ME_ID), null);
});

test('더미 시도 데이터로 전국 화면을 만들 수 있다', () => {
  const codes = Object.keys(adjacency).filter((c) => c.length === 2);
  const view = buildOwnerView(codes, getDummyOwner, adjacency, ME_ID);
  assert.ok(codes.every((c) => view.slots[c] != null));
});

test('범위 요약: 전체 리뷰 합과 사용자별 합계 최다', () => {
  const c = (ownerId, nickname, reviewCount) => ({ ownerId, nickname, reviewCount });
  const list = [
    owner('11', 'a', '가', 10, false, [c('b', '나', 4), c('c', '다', 3)]),
    owner('41', 'b', '나', 9, false, [c('a', '가', 5), c('c', '다', 2)]),
    null,
  ];
  const sum = summarizeScope(list);
  assert.equal(sum.totalReviews, 10 + 4 + 3 + 9 + 5 + 2);
  assert.deepEqual(sum.topPerson, { ownerId: 'a', nickname: '가', reviewCount: 15 });
});

test('범위 요약: 동점이면 닉네임 가나다순', () => {
  const list = [owner('11', 'z', '하늘', 5), owner('41', 'y', '가을', 5)];
  assert.equal(summarizeScope(list).topPerson.nickname, '가을');
  assert.equal(summarizeScope([...list].reverse()).topPerson.nickname, '가을');
});

test('범위 요약: 빈 범위는 합계 0, topPerson null', () => {
  assert.deepEqual(summarizeScope([null, null]), { totalReviews: 0, topPerson: null });
  assert.deepEqual(summarizeScope([]), { totalReviews: 0, topPerson: null });
});

test('전국 화면과 도 화면에서 같은 사용자의 슬롯이 같다', () => {
  const fixed = fixOwnerSlots(DUMMY_TERRITORY_OWNERS, adjacency, ME_ID);
  const nation = Object.keys(adjacency).filter((c) => c.length === 2);
  const gyeonggi = DUMMY_TERRITORY_OWNERS.map((o) => o.regionCode).filter((c) => c.startsWith('41') && c.length === 5);
  const a = buildOwnerView(nation, getDummyOwner, adjacency, ME_ID, fixed);
  const b = buildOwnerView(gyeonggi, getDummyOwner, adjacency, ME_ID, fixed);
  const slotOf = (view) => Object.fromEntries(Object.entries(view.ownerByRegion).filter(([, o]) => o).map(([c, o]) => [o.ownerId, view.slots[c]]));
  const sa = slotOf(a), sb = slotOf(b);
  let compared = 0;
  for (const id of Object.keys(sb)) if (id in sa) { assert.equal(sa[id], sb[id]); compared++; }
  assert.ok(compared > 0);
  for (const id of Object.keys(sb)) assert.equal(sb[id], fixed.ownerSlots[id]);
  assert.equal(b.sharedSlotOwners, fixed.sharedSlotOwners);
});
