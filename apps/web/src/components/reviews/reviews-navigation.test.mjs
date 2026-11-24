import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { reviewReturnHref, reviewStatusText, cleanRestaurantName } from './reviews-navigation.ts';

test('후기에서 돌아갈 때 검증된 지역과 음식 검색 조건을 보존한다', () => {
  assert.equal(reviewReturnHref(new URLSearchParams('regionCode=11140&foodId=3')), '/?regionCode=11140&foodId=3');
  assert.equal(reviewReturnHref(new URLSearchParams('regionCode=11140')), '/?regionCode=11140');
});
test('외부 주소 및 잘못된 검색 조건은 복귀 링크에 넣지 않는다', () => {
  assert.equal(reviewReturnHref(new URLSearchParams('regionCode=bad&foodId=abc&next=https://evil.test')), '/');
  assert.equal(reviewReturnHref(new URLSearchParams('regionCode=11140&foodId=0&next=https://evil.test')), '/?regionCode=11140');
});

test('조회 전과 조회 성공 후 빈 목록은 다르게 안내한다', () => {
  assert.match(reviewStatusText('unavailable').title, /준비/);
  assert.match(reviewStatusText('empty').title, /없어요/);
});

test('전달된 식당명은 100자 이내인 경우에만 사용한다', () => {
  assert.equal(cleanRestaurantName('  중구 & 식당  '), '중구 & 식당');
  assert.equal(cleanRestaurantName('<script>alert(1)</script>'), '<script>alert(1)</script>');
  assert.equal(cleanRestaurantName('x'.repeat(101)), null);
  assert.equal(cleanRestaurantName('   '), null);
  assert.equal(cleanRestaurantName(null), null);
});
