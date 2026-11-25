import assert from "node:assert/strict";
import test from "node:test";
import { publicRecords, recordLine, shareMessage, shareTitle } from "./share.ts";

const review = (visibility, region_code, food_name) => ({ visibility, region_code, food_name });

test("공유 미리보기는 공개 후기로 얻은 지역·음식만 모은다(받는 사람이 보는 것과 같다)", () => {
  const r = publicRecords([
    review("public", "11140", "굴"),
    review("private", "26350", "방어회"),
    review("public", "11140", null),
    review("public", null, "꼬막"),
  ]);
  assert.deepEqual(r.regionCodes, ["11140"]);
  assert.deepEqual(r.foodNames, ["굴", "꼬막"]);
});

test("공유 문장은 기준을 붙인 숫자 한 문장이다", () => {
  assert.equal(shareMessage({ type: "territory", nickname: "먹깨비", count: 3, total: 230 }), "먹깨비님은 전국 230곳 중 3곳을 칠했어요");
  assert.equal(shareMessage({ type: "collection", nickname: "먹깨비", count: 5, total: 43 }), "먹깨비님은 제철음식 43종 중 5종을 모았어요");
  assert.equal(shareMessage({ type: "territory", nickname: "먹깨비", count: 0, total: 230 }), "먹깨비님은 이제 영토를 칠하기 시작했어요");
});

test("공유 화면 제목", () => {
  assert.equal(shareTitle({ type: "territory", nickname: "먹깨비" }), "먹깨비님의 영토");
  assert.equal(shareTitle({ type: "collection", nickname: "먹깨비" }), "먹깨비님의 도감");
});

test("카드 안 문장은 제목의 이름을 반복하지 않는다", () => {
  assert.equal(recordLine({ type: "territory", count: 3, total: 230 }), "전국 230곳 중 3곳을 칠했어요");
  assert.equal(recordLine({ type: "collection", count: 0, total: 43 }), "아직 모은 음식이 없어요");
});
