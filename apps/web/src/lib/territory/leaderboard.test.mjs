import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { buildLeaderboard, myStanding, standingMessage } from './leaderboard.ts';

const owner = {
  regionCode: '11010', ownerId: 'a', nickname: '국밥순례자', reviewCount: 12, isMe: false,
  top: [
    { ownerId: 'me', nickname: '나', reviewCount: 9 },
    { ownerId: 'c', nickname: '면치기장인', reviewCount: 4 },
  ],
};

test('1위와 2·3위를 순위 번호와 함께 만든다', () => {
  const rows = buildLeaderboard(owner, 'me');
  assert.deepEqual(rows.map((r) => r.rank), [1, 2, 3]);
  assert.deepEqual(rows.map((r) => r.nickname), ['국밥순례자', '나', '면치기장인']);
  assert.deepEqual(rows.map((r) => r.isMe), [false, true, false]);
});

test('2·3위가 없어도 1위 한 줄을 만든다', () => {
  const rows = buildLeaderboard({ ...owner, top: undefined }, 'me');
  assert.equal(rows.length, 1);
});

test('owner가 없으면 빈 배열', () => {
  assert.deepEqual(buildLeaderboard(null, 'me'), []);
});

test('2위인 나는 주인까지 리뷰를 넘어서는 데 필요한 개수를 얻는다', () => {
  const s = myStanding(buildLeaderboard(owner, 'me'));
  assert.deepEqual(s, { rank: 2, toFirst: 4 });
});

test('내가 1위면 toFirst는 0', () => {
  const rows = buildLeaderboard({ ...owner, ownerId: 'me', isMe: true }, 'me');
  assert.deepEqual(myStanding(rows), { rank: 1, toFirst: 0 });
});

test('내가 3위 안에 없으면 null', () => {
  assert.equal(myStanding(buildLeaderboard(owner, 'zzz')), null);
});

test('문구', () => {
  assert.equal(standingMessage({ rank: 2, toFirst: 4 }), '이 지역에서 2위예요. 주인까지 리뷰 4개 남았어요.');
  assert.equal(standingMessage({ rank: 1, toFirst: 0 }), '내가 이 영토의 주인이에요');
  assert.equal(standingMessage(null), null);
});
