import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { validEatplUrl, buildRestaurantUrl, reviewUrl, parseSearch, sortRegions, regionLabel, formatReviewSummary, summarizeReviews } from './home-contract.ts';
test('잇플 상세 주소만 원본 그대로 허용', () => {
  const url = 'https://web.paybooc.ai/mer/web/profile/abc?source=original';
  assert.equal(validEatplUrl(url), url);
  for (const value of ['https://evil.test/mer/web/profile/x','https://user@web.paybooc.ai/mer/web/profile/x','javascript:alert(1)','https://web.paybooc.ai/mer/web/profile/']) assert.equal(validEatplUrl(value), null);
});
test('검색 조건을 정해진 API 계약으로 전달', () => {
  assert.equal(buildRestaurantUrl('http://localhost:4000', '11140', '3'), 'http://localhost:4000/restaurants?regionCode=11140&foodId=3');
  assert.equal(buildRestaurantUrl('http://localhost:4000', 'bad', null), null);
});
test('숫자가 아닌 도감 ID는 버리지 않고 미연결 상태로 표시', () => {
  assert.deepEqual(parseSearch('?food=strawberry&regionCode=11140'), { regionCode: '11140', foodId: null, unsupportedFood: true });
  assert.deepEqual(parseSearch('?foodId=3&regionCode=11140'), { regionCode: '11140', foodId: '3', unsupportedFood: false });
});
test('리뷰 경로는 안전한 식별자와 조건만 포함', () => {
  assert.equal(reviewUrl('abc-123','11140','3'), '/restaurants/abc-123/reviews?regionCode=11140&foodId=3');
  assert.equal(reviewUrl('../evil','11140',null), null);
});

test('리뷰 링크에 실제 식당명만 안전하게 전달하며 과도한 길이는 생략한다', () => {
  const result = reviewUrl('abc', '11140', '3', ' 가상 & 식당 ');
  assert.equal(result, '/restaurants/abc/reviews?regionCode=11140&foodId=3&name=%EA%B0%80%EC%83%81+%26+%EC%8B%9D%EB%8B%B9');
  assert.equal(reviewUrl('abc', '11140', null, 'x'.repeat(101)), '/restaurants/abc/reviews?regionCode=11140');
});
test('지역 목록은 화면에 표시되는 이름 기준 가나다순', () => {
  const regions = [{ code:'11', name:'서울특별시' }, { code:'12', name:'전남광주통합특별시' }, { code:'51', name:'강원특별자치도' }];
  assert.deepEqual(sortRegions(regions).map(r => regionLabel(r)), ['강원특별자치도','서울특별시','전남광주통합특별시']);
});

test('사용자 리뷰 집계가 있을 때만 평균과 건수를 표시한다', () => {
  assert.equal(formatReviewSummary(null), null);
  assert.equal(formatReviewSummary({ average: 4.36, count: 2 }), '사용자 평점 4.4점 · 리뷰 2개');
  assert.equal(formatReviewSummary({ average: 0, count: 0 }), null);
  assert.equal(formatReviewSummary({ average: 9, count: 3 }), null);
});

test('예시 리뷰 평균과 건수는 제공된 리뷰 목록에서 계산한다', () => {
  assert.deepEqual(summarizeReviews([{rating:5,text:'좋아요'}, {rating:4,text:'맛있어요'}]), {average:4.5,count:2,excerpt:'좋아요'});
  assert.equal(summarizeReviews([]), null);
  assert.equal(summarizeReviews([{rating:8,text:'잘못된 점수'}]), null);
});
