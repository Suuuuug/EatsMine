import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import * as mod from './sample-data.ts';

const { DUMMY_TERRITORY_OWNERS: owners, getDummyOwner } = mod;
const json = JSON.parse(readFileSync(new URL('../../../public/images/maps/region-codes.json', import.meta.url), 'utf8'));
const valid = new Set([...json.provinces.map((p) => p.code), ...json.territories.map((t) => t.code)]);

test('화면용 예시 안내 상수는 없다', () => assert.equal('EXAMPLE_NOTICE' in mod, false));

test('모든 지역 코드는 region-codes.json에 있는 실제 코드다', () => {
  for (const o of owners) assert.ok(valid.has(o.regionCode), o.regionCode);
});

test('시도는 모두 1위가 있고 시군구도 다수 채워졌다', () => {
  for (const p of json.provinces) assert.ok(getDummyOwner(p.code), p.code);
  assert.ok(owners.length > json.provinces.length + 40);
});

test('1위 없는 시군구와 내가 1위인 지역이 있다', () => {
  assert.ok(json.territories.some((t) => !getDummyOwner(t.code)));
  assert.ok(owners.some((o) => o.isMe));
  assert.ok(owners.some((o) => !o.isMe));
});

test('사용자는 8명을 넘는다', () => {
  const ids = new Set(owners.flatMap((o) => [o.ownerId, ...(o.top ?? []).map((t) => t.ownerId)]));
  assert.ok(ids.size > 8, String(ids.size));
});

test('1위 > 2위 > 3위 순이고 한 지역에서 사람이 겹치지 않는다', () => {
  for (const o of owners) {
    const all = [o, ...(o.top ?? [])];
    assert.equal(all.length, 3);
    for (let i = 1; i < all.length; i++) assert.ok(all[i - 1].reviewCount > all[i].reviewCount, o.regionCode);
    assert.equal(new Set(all.map((x) => x.ownerId)).size, 3, o.regionCode);
    assert.ok(all.every((x) => x.reviewCount >= 1));
    assert.equal(o.isMe, o.ownerId === 'dummy-me');
  }
});

test('이메일·실명 필드와 이메일 모양 값이 없다', () => {
  for (const o of owners) assert.doesNotMatch(JSON.stringify(o), /@|mail|realName/i);
});
