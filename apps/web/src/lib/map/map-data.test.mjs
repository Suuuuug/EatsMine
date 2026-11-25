import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { buildRegionSearchUrls, isPreviewMode, mergeSearchResults, territoriesUrl } from './map-data.ts';

const place = (id, rankLocal, merUrl = `https://web.paybooc.ai/mer/web/profile/${id}`) => ({ id, rankLocal, merUrl });
const result = (items) => ({ region: { code: '11140', fullName: '서울 중구' }, items, source: 'eat.pl', fetchedAt: 'now' });

test('API 주소가 없거나 preview=1이면 예시 모드', () => {
  assert.equal(isPreviewMode(undefined, ''), true);
  assert.equal(isPreviewMode('http://api', '?preview=1&region=11140'), true);
  assert.equal(isPreviewMode('http://api', '?region=11140'), false);
});

test('업종이 없으면 지역 1건, 여러 업종이면 업종마다 1건씩 조회', () => {
  assert.deepEqual(buildRegionSearchUrls('http://api/', '11140', []), ['http://api/restaurants?regionCode=11140']);
  assert.deepEqual(buildRegionSearchUrls('http://api', '11140', ['카페', '분식', '카페']), [
    'http://api/restaurants?regionCode=11140&genre=%EC%B9%B4%ED%8E%98',
    'http://api/restaurants?regionCode=11140&genre=%EB%B6%84%EC%8B%9D',
  ]);
  assert.deepEqual(buildRegionSearchUrls('http://api', '41', []), []);
  assert.equal(territoriesUrl('http://api/'), 'http://api/territories');
});

test('합칠 때 중복·잘못된 잇플 링크를 빼고 여러 업종이면 지역 순위순', () => {
  const merged = mergeSearchResults([
    result([place('a', 5), place('bad', 1, 'https://evil.test/x')]),
    result([place('b', 2), place('a', 5), place('c', null)]),
  ]);
  assert.deepEqual(merged.items.map((p) => p.id), ['b', 'a', 'c']);
  assert.equal(merged.source, 'eat.pl');
  assert.deepEqual(mergeSearchResults([result([place('z', 9), place('y', 1)])]).items.map((p) => p.id), ['z', 'y']);
  assert.equal(mergeSearchResults([]), null);
});
