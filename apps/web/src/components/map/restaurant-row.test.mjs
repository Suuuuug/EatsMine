import assert from 'node:assert/strict';
import test from 'node:test';
import { restaurantRowFacts } from './restaurant-row.ts';

test('값이 없으면 보조 정보 줄을 만들지 않는다', () => {
  assert.deepEqual(restaurantRowFacts({ rankNational: null, estimatedHours: null }), []);
});
test('값이 있을 때만 해당 문구를 만든다', () => {
  assert.deepEqual(restaurantRowFacts({ rankNational: 12, estimatedHours: null }), ['전국 매출 상위 12%']);
  assert.deepEqual(restaurantRowFacts({ rankNational: null, estimatedHours: { start: '11:00', end: '21:00' } }), ['영업 예상 시간 11:00–21:00']);
  assert.equal(restaurantRowFacts({ rankNational: 0, estimatedHours: { start: '11:00', end: '21:00' } }).length, 2);
});
