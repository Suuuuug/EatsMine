import assert from 'node:assert/strict';
import test from 'node:test';
import { initialCollectionFilter } from './collection-filter.ts';

test('수집 도감 바로가기의 명시된 값만 초기 상태로 허용한다', () => {
  assert.equal(initialCollectionFilter('collected'), 'collected');
  assert.equal(initialCollectionFilter(null), 'all');
  assert.equal(initialCollectionFilter('uncollected'), 'all');
});
