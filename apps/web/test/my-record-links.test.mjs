import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { myRecordLinks } from '../src/lib/my-page/record-links.ts';

test('도감은 수집 화면으로, 후기는 같은 화면의 기록으로 이동한다', () => {
  const links = myRecordLinks({ regionCount: 4, foodCount: 7, reviewCount: 3, member: true });
  assert.equal(links.find((item) => item.key === 'collection')?.href, '/dictionary?collection=collected');
  assert.equal(links.find((item) => item.key === 'reviews')?.href, '#my-reviews-title');
  assert.equal(links.find((item) => item.key === 'collection')?.value, '7개');
});
test('로그인 전에는 예시 기록 수를 내 기록처럼 표시하지 않는다', () => {
  const links = myRecordLinks({ regionCount: 4, foodCount: 7, reviewCount: 3, member: false });
  assert.equal(links.find((item) => item.key === 'collection')?.value, '둘러보기');
});
