import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { searchRegions, resolveRegionSelection, regionSearchParams } from './region-navigation.ts';
const regions = [
  { code: '11', parentCode: null, name: '서울특별시', fullName: '서울특별시' },
  { code: '11140', parentCode: '11', name: '중구', fullName: '서울특별시 중구' },
  { code: '26', parentCode: null, name: '부산광역시', fullName: '부산광역시' },
  { code: '26110', parentCode: '26', name: '중구', fullName: '부산광역시 중구' },
  { code: '12', parentCode: null, name: '전남광주통합특별시', fullName: '전남광주통합특별시' },
  { code: '12110', parentCode: '12', name: '광산구', fullName: '전남광주통합특별시 광산구' },
];
test('지역명 검색은 공백을 정리하고 같은 이름의 구를 전체 지역명으로 구분한다', () => {
  assert.deepEqual(searchRegions(regions, ' 서울  중구 ').map(r => r.code), ['11140']);
  assert.equal(searchRegions(regions, '중구').length, 2);
  assert.deepEqual(searchRegions(regions, '없는지역'), []);
  assert.deepEqual(searchRegions(regions, '  '), []);
});
test('시도 및 시군구 직접 주소를 복원하고 잘못된 부모는 무시한다', () => {
  assert.deepEqual(resolveRegionSelection(regions, new URLSearchParams('provinceCode=11')), { province: regions[0], region: null });
  assert.deepEqual(resolveRegionSelection(regions, new URLSearchParams('provinceCode=26&regionCode=11140')), { province: regions[0], region: regions[1] });
  assert.deepEqual(resolveRegionSelection(regions, new URLSearchParams('regionCode=12110')), { province: regions[4], region: regions[5] });
  assert.deepEqual(resolveRegionSelection(regions, new URLSearchParams('regionCode=invalid&provinceCode=invalid')), { province: null, region: null });
});
test('탐색 URL 변경은 음식 조건을 보존하고 이전 지역과 예시 조건은 지운다', () => {
  const params = new URLSearchParams('foodId=3&regionCode=26110&preview=1&view=reviews');
  assert.equal(regionSearchParams(params, '11', '11140').toString(), 'foodId=3&provinceCode=11&regionCode=11140');
  assert.equal(regionSearchParams(params, '11', null).toString(), 'foodId=3&provinceCode=11');
  assert.equal(regionSearchParams(params, null, null).toString(), 'foodId=3');
  assert.equal(params.get('regionCode'), '26110');
});
