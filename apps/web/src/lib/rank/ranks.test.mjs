import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { RANKS, rankOf, nextRank, progress } from './ranks.ts';

test('랭크는 브론즈부터 다이아까지 5단계이고 임계값이 오름차순이다', () => {
  assert.deepEqual(RANKS.map((r) => r.id), ['bronze', 'silver', 'gold', 'platinum', 'diamond']);
  assert.deepEqual(RANKS.map((r) => r.min), [0, 3, 10, 30, 60]);
  for (const r of RANKS) assert.match(r.src, /^\/images\/ranks\/[a-z]+\.svg$/);
});

test('rankOf는 경계값에서 올바른 단계를 돌려준다', () => {
  assert.equal(rankOf(0).id, 'bronze');
  assert.equal(rankOf(2).id, 'bronze');
  assert.equal(rankOf(3).id, 'silver');
  assert.equal(rankOf(9).id, 'silver');
  assert.equal(rankOf(10).id, 'gold');
  assert.equal(rankOf(30).id, 'platinum');
  assert.equal(rankOf(59).id, 'platinum');
  assert.equal(rankOf(60).id, 'diamond');
  assert.equal(rankOf(500).id, 'diamond');
});

test('잘못된 입력은 0으로 본다', () => {
  assert.equal(rankOf(-5).id, 'bronze');
  assert.equal(rankOf(Number.NaN).id, 'bronze');
  assert.equal(rankOf(4.9).id, 'silver');
});

test('nextRank는 다음 단계, 최고 랭크는 null', () => {
  assert.equal(nextRank('bronze').id, 'silver');
  assert.equal(nextRank('platinum').id, 'diamond');
  assert.equal(nextRank('diamond'), null);
});

test('progress는 다음 단계까지 남은 개수와 비율을 계산한다', () => {
  const p = progress(6);
  assert.equal(p.current.id, 'silver');
  assert.equal(p.next.id, 'gold');
  assert.equal(p.remaining, 4);
  assert.equal(p.ratio, (6 - 3) / (10 - 3));
  const start = progress(0);
  assert.equal(start.remaining, 3);
  assert.equal(start.ratio, 0);
});

test('최고 랭크는 next가 null이고 비율 1, 남은 개수 0', () => {
  const p = progress(75);
  assert.equal(p.current.id, 'diamond');
  assert.equal(p.next, null);
  assert.equal(p.remaining, 0);
  assert.equal(p.ratio, 1);
});
