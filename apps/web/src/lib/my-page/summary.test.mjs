import assert from "node:assert/strict";
import test from "node:test";
import { seasonProgress } from "./summary.ts";

const food = (id, seasons, months = []) => ({ id, name: id, seasons, months });
const foods = [food("a", ["winter"], [12, 1]), food("b", ["winter"], [11, 12]), food("c", ["summer"], [6]), food("d", ["winter"], [11]), food("e", ["autumn"], [9, 10, 11])];

test("이번 계절 제철음식 수와 모은 수를 센다", () => {
  const p = seasonProgress(foods, ["a", "c"], "winter");
  assert.equal(p.total, 3);
  assert.equal(p.collected, 1);
});

test("다음 음식은 이번 계절 중 이번 달 제철을 먼저 고른다", () => {
  assert.equal(seasonProgress(foods, [], "winter", 10, 11).next?.id, "b");
  assert.equal(seasonProgress(foods, ["b"], "winter", 10, 11).next?.id, "d");
});

test("이번 계절에 이번 달 것이 없으면 다른 계절이라도 이번 달 제철을, 그것도 없으면 이번 계절 음식을 고른다", () => {
  assert.equal(seasonProgress(foods, ["b", "d"], "winter", 10, 11).next?.id, "e");
  assert.equal(seasonProgress(foods, ["b", "d", "e"], "winter", 10, 11).next?.id, "a");
});

test("이번 계절 것을 다 모으면 다음 음식이 없다", () => {
  const p = seasonProgress(foods, ["a", "b", "d"], "winter", 10, 11);
  assert.equal(p.collected, 3);
  assert.equal(p.next?.id, "e"); // 겨울은 다 모았지만 이번 달 제철인 가을 음식이 남았다
  assert.equal(seasonProgress(foods, ["a", "b", "d", "e"], "winter", 10, 11).next, null);
});

test("이번 계절 제철음식을 먼저, 모은 것을 앞에 두고 limit개로 자른 미리보기를 만든다", () => {
  const p = seasonProgress(foods, ["d"], "winter", 2, 11);
  assert.deepEqual(p.preview.map((t) => [t.food.id, t.collected]), [["d", true], ["b", false]]);
});

import { foodDetailHref } from "./summary.ts";

test("음식 칸과 다음 음식 버튼은 같은 상세 주소로 간다(식당 찾기가 있는 곳)", () => {
  assert.equal(foodDetailHref("fresh-oysters"), "/dictionary?food=fresh-oysters");
  assert.equal(foodDetailHref("a b"), "/dictionary?food=a%20b");
});
