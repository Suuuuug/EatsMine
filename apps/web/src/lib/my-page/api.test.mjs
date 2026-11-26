import assert from "node:assert/strict";
import test from "node:test";
import { ApiError, createReviewErrorMessage, PhotoUploadError, photoUploadErrorMessage, reviewPhotoProblem, toMyPageData } from "./api.ts";

test("API 응답을 마이페이지 화면 모양으로 바꾼다", () => {
  const data = toMyPageData(
    { id: "u1", nickname: "미식탐험가1234", avatarUrl: null, createdAt: "2026-11-02T01:00:00.000Z" },
    [{ id: 7, restaurant: { id: "m1", name: "가게", merUrl: "https://eat.pl/x?a=1&b=2" }, rating: 9, content: null, visitedAt: null, visibility: "public", createdAt: "2026-11-20T03:00:00.000Z" }],
    { items: [{ regionCode: "11680", regionName: "서울 강남구", firstVisitedAt: "2026-11-03T00:00:00.000Z" }] },
    { items: [{ foodId: 3, foodName: "굴", collectedAt: "2026-11-16T00:00:00.000Z" }] },
  );
  assert.equal(data.isSample, false);
  assert.equal(data.regionVisits[0].region_id, 11680);
  assert.equal(data.foodCollection[0].food_name, "굴");
  const review = data.reviews[0];
  assert.equal(review.id, "7");
  assert.equal(review.mer_url, "https://eat.pl/x?a=1&b=2");
  assert.equal(review.rating, 5);
  assert.equal(review.content, "");
  assert.equal(review.visited_at, "2026-11-20");
});

test("리뷰 저장 실패 문구: 이미 쓴 매장(409)과 만료(401)를 구분한다", () => {
  assert.match(createReviewErrorMessage(409), /이미 리뷰를 남긴 매장/);
  assert.match(createReviewErrorMessage(401), /로그인이 만료/);
  assert.match(createReviewErrorMessage(500), /다시 시도/);
});

test("리뷰 사진: JPG, PNG, WEBP와 원본 20MB 이하만 고를 수 있다", () => {
  assert.equal(reviewPhotoProblem({ type: "image/jpeg", size: 1024 }), null);
  assert.equal(reviewPhotoProblem({ type: "image/webp", size: 12 * 1024 * 1024 }), null);
  assert.match(reviewPhotoProblem({ type: "image/gif", size: 10 }), /JPG, PNG, WEBP 사진만/);
  assert.match(reviewPhotoProblem({ type: "image/heic", size: 10 }), /JPG, PNG, WEBP 사진만/);
  assert.match(reviewPhotoProblem({ type: "image/png", size: 20 * 1024 * 1024 + 1 }), /20MB/);
});

test("사진 올리기 실패 문구: 저장소 413은 용량, 우리 API 401은 로그인, 저장소 401·5xx는 다시 시도", () => {
  assert.match(photoUploadErrorMessage(new PhotoUploadError(413)), /너무 커요/);
  assert.match(photoUploadErrorMessage(new ApiError(401)), /로그인이 만료/);
  assert.match(photoUploadErrorMessage(new PhotoUploadError(401)), /다시 시도/);
  assert.match(photoUploadErrorMessage(new PhotoUploadError(503)), /다시 시도/);
  assert.match(photoUploadErrorMessage(new TypeError("Failed to fetch")), /다시 시도/);
});

