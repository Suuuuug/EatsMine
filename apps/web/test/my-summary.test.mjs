import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { collectionSummary, pickPreviewFoods, territorySummary } from '../src/lib/my-page/summary.ts';

test('숫자 문구는 받은 개수로 만든다', () => {
  assert.equal(territorySummary(4, 230), '230곳 중 4곳');
  assert.equal(collectionSummary(7, 43), '43종 중 7종');
});
test('미리보기는 수집한 음식을 앞에 두고 모자라면 미수집으로 채운다', () => {
  const foods = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id }));
  const picked = pickPreviewFoods(foods, ['c', 'e'], 4);
  assert.deepEqual(picked.map((p) => p.food.id), ['c', 'e', 'a', 'b']);
  assert.deepEqual(picked.map((p) => p.collected), [true, true, false, false]);
});
test('수집이 limit보다 많으면 limit에서 자른다', () => {
  const foods = ['a', 'b', 'c'].map((id) => ({ id }));
  assert.equal(pickPreviewFoods(foods, ['a', 'b', 'c'], 2).length, 2);
});
