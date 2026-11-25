import assert from "node:assert/strict";
import test from "node:test";
import { seasonsForMonths } from "./food-seasons.ts";

test("음식 하나는 절기 계절 하나에만 들어간다", () => {
  assert.deepEqual(seasonsForMonths([11, 12, 1, 2]), ["winter"]); // 방어회
  assert.deepEqual(seasonsForMonths([1, 2, 3]), ["spring"]); // 입춘 뒤가 더 많다
  assert.deepEqual(seasonsForMonths([6, 7, 8]), ["summer"]);
  assert.deepEqual(seasonsForMonths([9, 10]), ["autumn"]);
});

test("입동 뒤인 11월은 겨울, 입춘 뒤인 2월은 봄이다", () => {
  assert.deepEqual(seasonsForMonths([11]), ["winter"]);
  assert.deepEqual(seasonsForMonths([2]), ["spring"]);
});

test("걸친 달 수가 같으면 제철이 시작되는 계절을 고른다", () => {
  assert.deepEqual(seasonsForMonths([4, 5]), ["spring"]);
  assert.deepEqual(seasonsForMonths([10, 11]), ["autumn"]);
});

test("달이 없으면 어느 계절에도 넣지 않는다", () => {
  assert.deepEqual(seasonsForMonths([]), []);
});

import { orderByMonth } from "./food-seasons.ts";

test("탭 안에서는 이번 달에 먹을 수 있는 음식이 먼저 오고, 나머지 순서는 그대로다", () => {
  const foods = [{ id: "홍어", months: [12, 1, 2] }, { id: "굴", months: [11, 12] }, { id: "곰치", months: [12, 1] }, { id: "방어", months: [11, 12, 1, 2] }];
  assert.deepEqual(orderByMonth(foods, 11).map((f) => f.id), ["굴", "방어", "홍어", "곰치"]);
  assert.deepEqual(orderByMonth(foods, 0).map((f) => f.id), ["홍어", "굴", "곰치", "방어"]); // 달을 모르면(서버) 그대로
});
