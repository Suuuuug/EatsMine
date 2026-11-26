import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { countLeading, sampleRanking, standingLine } from './my-standing.ts';

const entry = (position, nickname, reviewCount, isMe = false) => ({ position, nickname, rank: 'rookie', rankLabel: '', avatarUrl: null, reviewCount, isMe });
const ranking = (items, me = items.find((i) => i.isMe) ?? null) => ({
  windowDays: 30,
  items,
  me,
  standing: me ? (me.position === 1 ? { rank: 1, toFirst: 0 } : { rank: me.position, toFirst: items[0].reviewCount - me.reviewCount + 1 }) : null,
});

test('아무도 없으면 리뷰 하나로 1위가 된다고 말한다', () => {
  assert.equal(standingLine(ranking([])), '공개 리뷰 1개면 1위예요');
});

test('내가 1위면 그렇게 말하고, 2위와의 차이를 붙인다', () => {
  assert.equal(standingLine(ranking([entry(1, '나', 5, true), entry(2, '너', 3)])), '내가 1위예요. 2위와 2개 차이예요');
  assert.equal(standingLine(ranking([entry(1, '나', 2, true)])), '내가 1위예요');
});

test('1위가 아니면 1위까지 남은 리뷰 수를 말한다', () => {
  assert.equal(standingLine(ranking([entry(1, '너', 7), entry(2, '나', 3, true)])), '1위까지 리뷰 5개 남았어요');
});

test('순위에 없으면 1위 리뷰 수보다 하나 더 써야 한다', () => {
  assert.equal(standingLine(ranking([entry(1, '너', 4)])), '1위까지 리뷰 5개 남았어요');
});

test('1위인 지역 수를 센다', () => {
  const map = new Map([
    ['a', ranking([entry(1, '나', 2, true)])],
    ['b', ranking([entry(1, '너', 3), entry(2, '나', 1, true)])],
    ['c', null],
  ]);
  assert.equal(countLeading(map), 1);
});

test('예시 순위는 코드마다 같은 값을 돌려주고 1위부터 차례로 정렬된다', () => {
  const a = sampleRanking('11680');
  assert.deepEqual(a, sampleRanking('11680'));
  assert.ok(a.items.length >= 3);
  a.items.forEach((item, i) => assert.equal(item.position, i + 1));
  for (let i = 1; i < a.items.length; i += 1) assert.ok(a.items[i - 1].reviewCount >= a.items[i].reviewCount);
  assert.ok(a.me && a.me.nickname === '먹깨비');
});
