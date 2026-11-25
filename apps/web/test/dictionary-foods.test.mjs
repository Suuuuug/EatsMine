import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const web = new URL('../', import.meta.url);
const json = async (url) => JSON.parse(await readFile(url, 'utf8'));
const seed = await json(new URL('../api/data/foods.json', web));

test('시드 43종의 원본 정보와 음식명-그림 매핑을 모두 보존해요', async () => {
  const snapshot = await json(new URL('src/data/dictionary-foods.json', web));
  const { FOOD_ILLUSTRATIONS } = await import('../src/data/food-illustrations.ts');
  assert.equal(seed.length, 43);
  assert.deepEqual(snapshot, seed.map(({name, months, description, regions, searchKeyword}) => ({name, months, description, regions, searchKeyword})));
  assert.deepEqual(Object.keys(FOOD_ILLUSTRATIONS).sort(), seed.map(f => f.name).sort());
  assert.equal(new Set(Object.values(FOOD_ILLUSTRATIONS)).size, 43);
});

test('43종 모두 고유하고 렌더 가능한 64 격자 SVG와 manifest 항목이 있어요', async () => {
  const { FOOD_ILLUSTRATIONS } = await import('../src/data/food-illustrations.ts');
  const manifest = await json(new URL('public/images/foods/manifest.json', web));
  const hashes = new Set();
  for (const food of seed) {
    const slug = FOOD_ILLUSTRATIONS[food.name];
    assert.match(slug, /^[a-z]+(?:-[a-z]+)*$/);
    const entry = manifest.find(item => item.id === slug);
    assert.equal(entry?.name, food.name);
    assert.equal(entry?.src, `/images/foods/${slug}.svg`);
    const svg = await readFile(new URL(`public${entry.src}`, web), 'utf8');
    assert.match(svg, /viewBox="0 0 64 64"/);
    assert.match(svg, /stroke-width="2.4"/);
    assert.doesNotMatch(svg, /<(?:script|text|image|use|foreignObject|linearGradient|radialGradient)\b|#[\da-f]{3,8}\b|(?:href|onload)=/i);
    hashes.add(createHash('sha256').update(svg.replace(/<title>.*?<\/title>/s, '')).digest('hex'));
    const rendered = await sharp(Buffer.from(svg)).resize(128,128).png().toBuffer();
    assert.ok(rendered.length > 500, food.name);
  }
  assert.equal(hashes.size, 43);
});

test('기존 20종 SVG를 계속 제공해요', async () => {
  for (const slug of ['strawberry','wild-greens','chives','watermelon','peach','corn','persimmon','shiitake','sweet-potato','yellowtail','oyster','tangerine','chestnut','pear','mackerel','crab','asparagus','tomato','cucumber','radish']) {
    assert.match(await readFile(new URL(`public/images/foods/${slug}.svg`, web), 'utf8'), /<svg/);
  }
});

test('계절 경계와 건너뛴 달을 원본대로 표시해요', async () => {
  const { seasonsForMonths, formatFoodMonths } = await import('../src/data/food-seasons.ts');
  assert.deepEqual(seasonsForMonths([1,2,3]), ['spring', 'winter']);
  assert.deepEqual(seasonsForMonths([4,5,6,9,10]), ['spring', 'summer', 'autumn']);
  assert.equal(formatFoodMonths([4,5,6,9,10]), '4월, 5월, 6월, 9월, 10월');
  assert.equal(formatFoodMonths([11,12,1,2]), '11월, 12월, 1월, 2월');
});
