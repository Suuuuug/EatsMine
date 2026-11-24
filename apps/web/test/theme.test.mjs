import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { parseTheme } from '../src/lib/theme/theme.ts';

test('저장된 자동·라이트·다크 설정을 복원한다', () => {
  assert.equal(parseTheme('system'), 'system');
  assert.equal(parseTheme('light'), 'light');
  assert.equal(parseTheme('dark'), 'dark');
});
test('잘못된 저장값은 기기 설정을 따른다', () => {
  assert.equal(parseTheme('unknown'), 'system');
  assert.equal(parseTheme(null), 'system');
});

test('계절 배경은 현재 월에 맞게 고른다', async () => {
  const { seasonForMonth } = await import('../src/lib/theme/theme.ts');
  assert.equal(seasonForMonth(3), 'spring');
  assert.equal(seasonForMonth(6), 'summer');
  assert.equal(seasonForMonth(9), 'autumn');
  assert.equal(seasonForMonth(12), 'winter');
  assert.equal(seasonForMonth(1), 'winter');
});
