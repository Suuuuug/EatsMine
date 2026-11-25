import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { seasonForDate } from './theme.ts';

test('계절은 달이 아니라 절기(입춘·입하·입추·입동)로 나뉜다', () => {
  assert.equal(seasonForDate(2, 3), 'winter');
  assert.equal(seasonForDate(2, 4), 'spring');
  assert.equal(seasonForDate(5, 4), 'spring');
  assert.equal(seasonForDate(5, 5), 'summer');
  assert.equal(seasonForDate(8, 6), 'summer');
  assert.equal(seasonForDate(8, 7), 'autumn');
  assert.equal(seasonForDate(11, 6), 'autumn');
  assert.equal(seasonForDate(11, 7), 'winter');
});

test('2026-11-25는 겨울이고 연말·연초도 겨울이다', () => {
  assert.equal(seasonForDate(11, 25), 'winter');
  assert.equal(seasonForDate(12, 31), 'winter');
  assert.equal(seasonForDate(1, 1), 'winter');
});

test('기기 시간대와 상관없이 한국 날짜로 계절을 정한다', async () => {
  const { currentSeason } = await import('./theme.ts');
  // 2026-11-06 16:00 UTC = 한국 11-07 01:00 → 입동 이후라 겨울
  assert.equal(currentSeason(new Date('2026-11-06T16:00:00Z')), 'winter');
  // 2026-11-06 14:00 UTC = 한국 11-06 23:00 → 아직 가을
  assert.equal(currentSeason(new Date('2026-11-06T14:00:00Z')), 'autumn');
});
