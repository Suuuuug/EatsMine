import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { myRecordLinks } from '../src/lib/my-page/record-links.ts';

test('도감은 수집 화면으로 이동하고 후기는 화면에 한 번만 표시한다', () => {
  const links = myRecordLinks({ regionCount: 4, foodCount: 7, member: true });
  assert.equal(links.find((item) => item.key === 'collection')?.href, '/dictionary?collection=collected');
  assert.equal(links.some((item) => item.key === 'reviews'), false);
  assert.equal(links.find((item) => item.key === 'collection')?.value, '7개');
});
test('로그인 전에는 예시 기록 수를 내 기록처럼 표시하지 않는다', () => {
  const links = myRecordLinks({ regionCount: 4, foodCount: 7, member: false });
  assert.equal(links.find((item) => item.key === 'collection')?.value, '둘러보기');
});
