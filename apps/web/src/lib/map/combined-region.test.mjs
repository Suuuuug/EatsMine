import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { combinedRegions, isGwangjuDistrict } from './combined-region.ts';

const children = [
  { code: '12210', parentCode: '12', name: '동구', fullName: '전남광주통합특별시 동구' },
  { code: '12110', parentCode: '12', name: '목포시', fullName: '전남광주통합특별시 목포시' },
];
test('통합 지역은 광주를 선택한 뒤 구를 보여준다', () => {
  assert.deepEqual(combinedRegions(children, false).map((r) => r.name).sort(), ['광주', '목포시']);
  assert.deepEqual(combinedRegions(children, true).map((r) => r.name), ['동구']);
  assert.equal(isGwangjuDistrict('12210'), true);
  assert.equal(isGwangjuDistrict('12110'), false);
});
