import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ALL_GENRES } from '../eatpl/genres.js';

// data/foods.json(팀 직접 큐레이션)을 고칠 때 실수를 잡는다. seed 전에 npm test로 확인.
const dataDir = join(import.meta.dirname, '..', '..', 'data');
type FoodJson = {
  name: string;
  months: number[];
  description: string;
  genres: string[];
  searchKeyword: string | null;
  regions: { code: string; name: string; reason: string }[];
  imageUrl: string | null;
  sourceUrl: string | null;
};
const foods: FoodJson[] = JSON.parse(
  readFileSync(join(dataDir, 'foods.json'), 'utf-8'),
);
const regions: { code: string; level: string; fullName: string }[] = JSON.parse(
  readFileSync(join(dataDir, 'regions.json'), 'utf-8'),
);
const sigungu = new Map(
  regions.filter((r) => r.level === 'sigungu').map((r) => [r.code, r.fullName]),
);

describe('data/foods.json', () => {
  it('음식 이름이 겹치지 않는다', () => {
    const names = foods.map((f) => f.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it.each(foods.map((f) => [f.name, f] as const))('%s', (_name, food) => {
    expect(food.description.trim()).not.toBe('');
    // 제철 월: 1~12, 중복 없음, 1개 이상
    expect(food.months.length).toBeGreaterThan(0);
    expect(new Set(food.months).size).toBe(food.months.length);
    for (const m of food.months)
      expect(m >= 1 && m <= 12 && Number.isInteger(m)).toBe(true);
    // 업종: 잇플 43종만, 1개 이상
    expect(food.genres.length).toBeGreaterThan(0);
    for (const g of food.genres) expect(ALL_GENRES).toContain(g);
    // 추천 지역: 실제 시·군·구 코드, 이름 일치, 이유 있음
    for (const r of food.regions) {
      expect(sigungu.get(r.code), `${food.name}: 지역 코드 ${r.code}`).toBe(
        r.name,
      );
      expect(r.reason.trim()).not.toBe('');
    }
    expect(new Set(food.regions.map((r) => r.code)).size).toBe(
      food.regions.length,
    );
    // 링크는 https만
    for (const url of [food.imageUrl, food.sourceUrl])
      if (url) expect(url).toMatch(/^https:\/\//);
  });
});
