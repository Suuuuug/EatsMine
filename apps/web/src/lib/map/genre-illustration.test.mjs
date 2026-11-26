import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DEFAULT_GENRE_FOOD, genreIllustration, hasGenreIllustration } from './genre-illustration.ts';

const PUBLIC = resolve(import.meta.dirname, '../../../public');
// 잇플 업종 43종(api의 MAJOR_GENRES + MINOR_GENRES)
const genresSource = readFileSync(resolve(import.meta.dirname, '../../../../api/src/eatpl/genres.ts'), 'utf8');
const ALL_GENRES = [...genresSource.matchAll(/'([^']+)'/g)].map((m) => m[1]);

test('잇플 업종 43종 모두 실제로 있는 도감 그림이 정해져 있다', () => {
  assert.equal(ALL_GENRES.length, 43);
  for (const genre of ALL_GENRES) {
    const src = genreIllustration(genre);
    assert.ok(hasGenreIllustration(genre), `${genre}: 대응표에 없음(기본 그림으로 빠짐)`);
    assert.ok(existsSync(resolve(PUBLIC, `.${src}`)), `${genre} → ${src} 파일 없음`);
  }
});

test('업종별 그림, 업종이 없거나 모르는 업종은 기본 그림', () => {
  assert.equal(genreIllustration('카페'), '/images/foods/strawberry-dessert.svg');
  assert.equal(genreIllustration('치킨'), '/images/foods/samgyetang.svg');
  assert.equal(genreIllustration(null), `/images/foods/${DEFAULT_GENRE_FOOD}.svg`);
  assert.equal(genreIllustration('없는업종'), `/images/foods/${DEFAULT_GENRE_FOOD}.svg`);
});
