import assert from "node:assert/strict";
import test from "node:test";
import { fitWithin, PHOTO_MAX_EDGE } from "./review-photo-process.ts";

test("사진 크기: 긴 변을 1600px 이하로, 비율 유지, 작은 사진은 그대로", () => {
  assert.equal(PHOTO_MAX_EDGE, 1600);
  assert.deepEqual(fitWithin(4032, 3024, 1600), { width: 1600, height: 1200 });
  assert.deepEqual(fitWithin(3024, 4032, 1600), { width: 1200, height: 1600 });
  assert.deepEqual(fitWithin(800, 600, 1600), { width: 800, height: 600 });
  assert.deepEqual(fitWithin(10000, 1, 1600), { width: 1600, height: 1 });
});
