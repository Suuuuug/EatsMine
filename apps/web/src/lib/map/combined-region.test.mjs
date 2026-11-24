import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { sortRegions } from './home-contract.ts';

test('통합 지역은 광주 선택 없이 다섯 구와 전남 시군을 바로 표시한다', () => {
  const seed = JSON.parse(readFileSync(new URL('./region-seed.json', import.meta.url), 'utf8'));
  const regions = sortRegions(seed.filter((r) => r.parentCode === '12'));
  for (const name of ['광산구', '남구', '동구', '북구', '서구', '목포시']) assert.ok(regions.some((r) => r.name === name));
  assert.ok(!regions.some((r) => r.name === '광주'));
  assert.equal(regions.find((r) => r.name === '광산구').fullName, '전남광주통합특별시 광산구');
});
