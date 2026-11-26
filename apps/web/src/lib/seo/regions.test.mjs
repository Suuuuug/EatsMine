import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  ALL_REGIONS,
  buildRegionJsonLd,
  getFoodsForRegion,
  getProvinceEntryRegion,
  getRegionByCode,
  getRegionSeoMeta,
  getSiblingRegions,
  regionHref,
  regionPath,
  toRegionItem,
} from "./regions.ts";
import {
  POPULAR_TRAVEL_DESTINATIONS,
  SITE_URL,
  TRAVEL_PROVINCES,
} from "./site.ts";

test("전국 230개 시·군·구 정적 SEO 목록이 중복 코드 없이 모두 로드된다", () => {
  assert.equal(ALL_REGIONS.length, 230);
  const codes = new Set(ALL_REGIONS.map((r) => r.code));
  assert.equal(codes.size, 230);

  // 대표 여행지 20곳이 모두 유효한 지역 코드와 매칭된다
  for (const dest of POPULAR_TRAVEL_DESTINATIONS) {
    const region = getRegionByCode(dest.code);
    assert.ok(region, `대표 여행지 코드 ${dest.code} 누락`);
    assert.equal(region.isPopular, true);
    assert.equal(region.popularName, dest.name);
  }
});

test("regionPath와 regionHref가 정규 지역 경로와 예시 쿼리를 올바르게 생성한다", () => {
  assert.equal(regionPath("51150"), "/regions/51150");
  assert.equal(regionHref("51150", false), "/regions/51150");
  assert.equal(regionHref("51150", true), "/regions/51150?preview=1");
});

test("getRegionByCode가 유효한 코드와 없는 코드를 정확히 구분한다", () => {
  const gangneung = getRegionByCode("51150");
  assert.ok(gangneung);
  assert.equal(gangneung.fullName, "강원도 강릉시");
  assert.equal(gangneung.provinceName, "강원도");
  assert.equal(gangneung.provinceOfficialName, "강원특별자치도");

  const sejong = getRegionByCode("36110");
  assert.ok(sejong);
  assert.equal(sejong.fullName, "세종");

  assert.equal(getRegionByCode("99999"), null);
  assert.equal(getRegionByCode(""), null);

  const item = toRegionItem(gangneung);
  assert.equal(item.code, "51150");
  assert.equal(item.name, "강릉시");
  assert.equal(item.fullName, "강원도 강릉시");
  assert.equal(typeof item.centerLat, "number");
  assert.equal(typeof item.centerLng, "number");
});

test("지역별 추천 제철음식과 같은 시·도 인접 여행지 링크를 반환한다", () => {
  const pohangFoods = getFoodsForRegion("47110");
  assert.ok(pohangFoods.some((f) => f.name === "과메기"));

  const tongyeongFoods = getFoodsForRegion("48220");
  assert.ok(tongyeongFoods.some((f) => f.name === "굴"));

  const gangneungSiblings = getSiblingRegions("51150");
  assert.ok(gangneungSiblings.length > 0);
  assert.ok(gangneungSiblings.every((r) => r.parentCode === "51"));
  assert.ok(gangneungSiblings.every((r) => r.code !== "51150"));

  // 세종은 단일 시·군·구라 형제 지역이 없다
  assert.deepEqual(getSiblingRegions("36110"), []);
});

test("16개 시·도 모두가 대표 진입 지역을 가져 고아 페이지 없이 연결된다", () => {
  for (const province of TRAVEL_PROVINCES) {
    const entry = getProvinceEntryRegion(province.code);
    assert.ok(entry, `시·도 ${province.code}(${province.displayName}) 진입 지역 누락`);
    assert.equal(entry.parentCode, province.code);
  }
});

test("getRegionSeoMeta와 buildRegionJsonLd가 고유 메타와 구조화 데이터를 생성한다", () => {
  const seogwipo = getRegionByCode("50130");
  assert.ok(seogwipo);
  const foods = getFoodsForRegion("50130");
  const meta = getRegionSeoMeta(seogwipo);

  assert.equal(meta.canonicalPath, "/regions/50130");
  assert.equal(meta.canonicalUrl, `${SITE_URL}/regions/50130`);
  assert.ok(meta.title.includes("제주도 서귀포시"));
  assert.ok(meta.description.includes("방어회"));

  const jsonLd = buildRegionJsonLd(seogwipo, foods);
  assert.equal(jsonLd["@graph"].length, 2);
  assert.equal(jsonLd["@graph"][0]["@type"], "BreadcrumbList");
  assert.equal(jsonLd["@graph"][1]["@type"], "TouristDestination");
  assert.equal(jsonLd["@graph"][1].url, `${SITE_URL}/regions/50130`);
});
