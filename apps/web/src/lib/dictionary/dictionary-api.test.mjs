import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  mergeFoodDetailWithApi,
  mergeFoodsWithApi,
  normalizeApiBase,
  resolveCollectedSlugs,
  toTerritoryOwnerMap,
  validHttpsUrl,
} from "./dictionary-api.ts";

const FALLBACK_FOODS = [
  {
    id: "yellowtail-sashimi",
    name: "방어회",
    seasons: ["winter"],
    months: [11, 12, 1, 2],
    description: "기존 설명",
    src: "/images/foods/yellowtail-sashimi.svg",
    seasonLabel: "11월, 12월, 1월, 2월",
    regions: [
      { code: "50130", name: "제주특별자치도 서귀포시", reason: "모슬포항 방어축제" },
    ],
    keywords: ["방어"],
  },
  {
    id: "fresh-oysters",
    name: "굴",
    seasons: ["winter"],
    months: [11, 12, 1, 2],
    description: "굴 설명",
    src: "/images/foods/fresh-oysters.svg",
    seasonLabel: "11월, 12월, 1월, 2월",
    regions: [
      { code: "48220", name: "경상남도 통영시", reason: "국내 대표 굴 산지" },
    ],
    keywords: ["굴"],
  },
];

test("GET /foods 응답을 스냅샷과 병합해 숫자 apiId와 최신 제철·설명을 반영한다", () => {
  const merged = mergeFoodsWithApi(FALLBACK_FOODS, [
    {
      id: 1,
      name: "방어회",
      description: "DB 최신 설명",
      imageUrl: null,
      months: [11, 12, 1],
    },
    {
      id: 99,
      name: "신규음식",
      description: "새로 추가된 음식",
      imageUrl: "https://cdn.example.com/new.png",
      months: [4, 5],
    },
  ]);

  assert.equal(merged.length, 2);
  assert.equal(merged[0].id, "yellowtail-sashimi");
  assert.equal(merged[0].apiId, 1);
  assert.equal(merged[0].description, "DB 최신 설명");
  assert.equal(merged[0].src, "/images/foods/yellowtail-sashimi.svg");
  assert.equal(merged[0].regions.length, 1);
  assert.equal(merged[1].id, "food-99");
  assert.equal(merged[1].apiId, 99);
  assert.equal(merged[1].src, "https://cdn.example.com/new.png");
  assert.deepEqual(merged[1].seasons, ["spring"]);
});

test("GET /foods/:id 상세 응답을 병합하고 안전하지 않은 sourceUrl은 버린다", () => {
  const updated = mergeFoodDetailWithApi(FALLBACK_FOODS[0], {
    id: 1,
    name: "방어회",
    description: "상세 설명",
    imageUrl: null,
    sourceUrl: "javascript:alert(1)",
    months: [12, 1, 2],
    regions: [
      { code: "50130", fullName: "제주특별자치도 서귀포시", reason: "모슬포" },
      { code: "bad", fullName: "잘못된 코드", reason: "제외" },
    ],
    genres: ["일식회집", "스시/초밥"],
  });

  assert.equal(updated.apiId, 1);
  assert.equal(updated.description, "상세 설명");
  assert.equal(updated.sourceUrl, null);
  assert.deepEqual(updated.regions, [
    { code: "50130", name: "제주특별자치도 서귀포시", reason: "모슬포" },
  ]);
  assert.deepEqual(updated.genres, ["일식회집", "스시/초밥"]);
  assert.equal(validHttpsUrl("https://example.com/a"), "https://example.com/a");
  assert.equal(validHttpsUrl("http://example.com/a"), null);
});

test("GET /territories 응답과 /me/collection 수집 기록을 정확히 매핑한다", () => {
  const { windowDays, ownersByRegion } = toTerritoryOwnerMap({
    windowDays: 30,
    items: [
      { regionCode: "48220", ownerNickname: "미식가", reviewCount: 5 },
      { regionCode: "bad", ownerNickname: "무시", reviewCount: 1 },
    ],
  });
  assert.equal(windowDays, 30);
  assert.deepEqual(ownersByRegion["48220"], {
    regionCode: "48220",
    ownerNickname: "미식가",
    reviewCount: 5,
  });
  assert.equal(ownersByRegion["bad"], undefined);

  const foods = mergeFoodsWithApi(FALLBACK_FOODS, [
    { id: 1, name: "방어회", description: "", imageUrl: null, months: [12] },
    { id: 2, name: "굴", description: "", imageUrl: null, months: [12] },
  ]);
  const collected = resolveCollectedSlugs(foods, [2], []);
  assert.equal(collected.has("fresh-oysters"), true);
  assert.equal(collected.has("yellowtail-sashimi"), false);
  assert.equal(normalizeApiBase("https://eatsmine-api.vercel.app///"), "https://eatsmine-api.vercel.app");
  assert.equal(normalizeApiBase("   "), null);
});
