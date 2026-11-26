import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { buildRegionSearchUrl, isPreviewMode, keepValidPlaces, MAX_GENRES, territoriesUrl, toCardReview, pagePlaces, PLACE_PAGE_SIZE } from './map-data.ts';

const place = (id, merUrl = `https://web.paybooc.ai/mer/web/profile/${id}`) => ({ id, merUrl });

test('API 주소가 없거나 preview=1이면 예시 모드', () => {
  assert.equal(isPreviewMode(undefined, ''), true);
  assert.equal(isPreviewMode('http://api', '?preview=1&region=11140'), true);
  assert.equal(isPreviewMode('http://api', '?region=11140'), false);
});

test('업종은 genre를 반복해 한 번에 보내고, 중복은 빼고 최대 개수까지만', () => {
  assert.equal(buildRegionSearchUrl('http://api/', '11140', []), 'http://api/restaurants?regionCode=11140');
  assert.equal(
    buildRegionSearchUrl('http://api', '11140', ['카페', '분식', '카페']),
    'http://api/restaurants?regionCode=11140&genre=%EC%B9%B4%ED%8E%98&genre=%EB%B6%84%EC%8B%9D',
  );
  const many = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
  const url = new URL(buildRegionSearchUrl('http://api', '11140', many));
  assert.equal(url.searchParams.getAll('genre').length, MAX_GENRES);
  assert.equal(buildRegionSearchUrl('http://api', '41', []), null);
  assert.equal(territoriesUrl('http://api/'), 'http://api/territories');
});

test('잘못된 잇플 링크 매장은 뺀다', () => {
  const result = { region: { code: '11140', fullName: '서울 중구' }, items: [place('a'), place('bad', 'https://evil.test/x')], source: 'eat.pl', fetchedAt: 'now' };
  assert.deepEqual(keepValidPlaces(result).items.map((p) => p.id), ['a']);
});

test('카드 리뷰 요약: 공개 리뷰가 없으면 null, 대표 리뷰가 없으면 글 없이', () => {
  assert.equal(toCardReview(null), null);
  assert.equal(toCardReview(undefined), null);
  assert.equal(toCardReview({ average: 0, count: 0, featured: null }), null);
  assert.deepEqual(toCardReview({ average: 4.5, count: 2, featured: { id: 1, nickname: 'a', rating: 5, content: ' 맛있어요 ' } }), { average: 4.5, count: 2, excerpt: '맛있어요' });
  assert.deepEqual(toCardReview({ average: 3, count: 1, featured: null }), { average: 3, count: 1, excerpt: null });
});

test('목록은 한 페이지씩 보여주고 남은 개수를 센다', () => {
  const items = Array.from({ length: 45 }, (_, i) => i);
  assert.deepEqual(pagePlaces(items, 0).visible.length, PLACE_PAGE_SIZE);
  assert.equal(pagePlaces(items, 0).remaining, 45 - PLACE_PAGE_SIZE);
  assert.equal(pagePlaces(items, 40).visible.length, 40);
  assert.deepEqual(pagePlaces(items, 60), { visible: items, remaining: 0 });
  assert.deepEqual(pagePlaces([1, 2], 20), { visible: [1, 2], remaining: 0 });
});
