import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseFoodSelection, foodSelectionParams, buildFoodIndex, findFoodRegions, groupByProvince } from './food-region-selection.ts';

const root = resolve(import.meta.dirname, '../../..');
const foods = JSON.parse(readFileSync(resolve(root, 'src/data/dictionary-foods.json'), 'utf8'));
const meta = JSON.parse(readFileSync(resolve(root, 'public/images/maps/region-codes.json'), 'utf8'));
const illustrationSource = readFileSync(resolve(root, 'src/data/food-illustrations.ts'), 'utf8');
const illustrations = Object.fromEntries([...illustrationSource.matchAll(/"([^"]+)":\s*"([^"]+)"/g)].map(m => [m[1], m[2]]));
const index = buildFoodIndex(foods, illustrations);

test('food와 regionCode를 읽고 잘못된 값은 무시한다', () => {
  assert.deepEqual(parseFoodSelection(new URLSearchParams('food=fresh-oysters&regionCode=48220')), { food: 'fresh-oysters', regionCode: '48220' });
  assert.deepEqual(parseFoodSelection(new URLSearchParams('food=../x&regionCode=4822')), { food: null, regionCode: null });
  assert.deepEqual(parseFoodSelection(new URLSearchParams('food=Bad_Slug&regionCode=abcde')), { food: null, regionCode: null });
  assert.deepEqual(parseFoodSelection(new URLSearchParams('')), { food: null, regionCode: null });
});

test('알려진 슬러그 목록을 주면 모르는 음식은 무시한다', () => {
  const slugs = new Set(index.map(f => f.slug));
  assert.equal(parseFoodSelection(new URLSearchParams('food=fresh-oysters'), slugs).food, 'fresh-oysters');
  assert.equal(parseFoodSelection(new URLSearchParams('food=unknown-food'), slugs).food, null);
});

test('직렬화는 기존 collection을 유지하고 null은 지운다', () => {
  const base = new URLSearchParams('collection=collected&food=old&regionCode=11110');
  assert.equal(foodSelectionParams(base, { food: 'ramen', regionCode: null }).toString(), 'collection=collected&food=ramen');
  assert.equal(foodSelectionParams(base, { food: 'ramen', regionCode: '48220' }).toString(), 'collection=collected&food=ramen&regionCode=48220');
  assert.equal(foodSelectionParams(base, { food: null, regionCode: null }).toString(), 'collection=collected');
  assert.equal(foodSelectionParams(base, { food: 'Bad', regionCode: '1' }).toString(), 'collection=collected');
  assert.equal(base.get('food'), 'old');
});

test('43종 모두 슬러그가 있고 중복이 없다', () => {
  assert.equal(index.length, 43);
  assert.equal(new Set(index.map(f => f.slug)).size, 43);
});

test('모든 추천 지역 코드가 region-codes.json 시군구에 있다', () => {
  const codes = new Set(meta.territories.map(t => t.code));
  for (const food of index) for (const region of food.regions) assert.ok(codes.has(region.code), `${food.name} ${region.code}`);
});

test('추천 지역이 없는 음식 6종은 빈 배열을 돌려준다', () => {
  const empty = index.filter(f => f.regions.length === 0).map(f => f.name).sort();
  assert.deepEqual(empty, ['굴짬뽕', '냉모밀', '딸기 디저트', '라멘', '빙수', '팥죽'].sort());
  assert.deepEqual(findFoodRegions(index, 'ramen'), []);
  assert.deepEqual(findFoodRegions(index, 'nope'), []);
  assert.deepEqual(findFoodRegions(index, null), []);
});

test('굴은 통영과 보령을 추천한다', () => {
  assert.deepEqual(findFoodRegions(index, 'fresh-oysters').map(r => r.code), ['48220', '44180']);
});

test('5자리 코드를 시도로 모으고 모르는 코드는 버린다', () => {
  const grouped = groupByProvince(['48220', '44180', '48170', '99999'], meta.territories);
  assert.deepEqual(grouped, [
    { provinceCode: '48', codes: ['48220', '48170'] },
    { provinceCode: '44', codes: ['44180'] },
  ]);
  assert.deepEqual(groupByProvince([], meta.territories), []);
});
