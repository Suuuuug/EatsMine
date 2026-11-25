import assert from 'node:assert/strict';
import test from 'node:test';
import { nextRegionIndex } from './food-region-nav.ts';

test('방향키는 범위 안에서만 이동한다', () => {
  assert.equal(nextRegionIndex('ArrowDown', 0, 3), 1);
  assert.equal(nextRegionIndex('ArrowDown', 2, 3), 2);
  assert.equal(nextRegionIndex('ArrowUp', 0, 3), 0);
  assert.equal(nextRegionIndex('ArrowUp', 2, 3), 1);
  assert.equal(nextRegionIndex('ArrowDown', -1, 3), 0);
});
test('다른 키와 빈 목록은 null', () => {
  assert.equal(nextRegionIndex('a', 0, 3), null);
  assert.equal(nextRegionIndex('ArrowDown', 0, 0), null);
  assert.equal(nextRegionIndex('End', 0, 3), 2);
});
