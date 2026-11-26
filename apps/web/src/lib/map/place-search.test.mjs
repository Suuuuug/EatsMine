import assert from "node:assert/strict";
import test from "node:test";
import { MIN_PLACE_QUERY, normalizeQuery, placeNote, placeKind, searchPlacesWith, stationBaseName, withEyo, withSubject } from "./place-search.ts";

test("검색어는 앞뒤 공백을 지우고 연속 공백을 하나로 모은다", () => {
  assert.equal(normalizeQuery("  강남   역 "), "강남 역");
  assert.equal(MIN_PLACE_QUERY, 2);
});

test("받침에 따라 이/가를 붙인다", () => {
  assert.equal(withSubject("강남역"), "강남역이");
  assert.equal(withSubject("해운대"), "해운대가");
  assert.equal(withSubject("경복궁"), "경복궁이");
  assert.equal(withSubject("서울숲"), "서울숲이");
});

test("받침에 따라 예요/이에요를 붙인다", () => {
  assert.equal(withEyo("서울특별시 강남구"), "서울특별시 강남구예요");
  assert.equal(withEyo("강원특별자치도 영월군"), "강원특별자치도 영월군이에요");
  assert.equal(withEyo("경기도 수원시"), "경기도 수원시예요");
});

test("눌렀을 때 결과 위에 보이는 한 문장", () => {
  assert.equal(placeNote("강남역", "서울특별시 강남구"), "강남역이 있는 서울특별시 강남구예요");
  assert.equal(placeNote("영월역", "강원특별자치도 영월군"), "영월역이 있는 강원특별자치도 영월군이에요");
});

test("장소 종류: 역·명소·문화시설·학교·공공기관만 쓰고 식당·카페 같은 건 뺀다", () => {
  assert.equal(placeKind({ category_group_code: "SW8", category_name: "교통,수송 > 지하철,전철" }), "station");
  assert.equal(placeKind({ category_group_code: "AT4", category_name: "여행 > 관광,명소" }), "landmark");
  assert.equal(placeKind({ category_group_code: "CT1", category_name: "문화,예술 > 박물관" }), "landmark");
  assert.equal(placeKind({ category_group_code: "SC4", category_name: "교육,학문 > 대학교" }), "landmark");
  assert.equal(placeKind({ category_group_code: "", category_name: "교통,수송 > 기차역 > KTX" }), "station");
  assert.equal(placeKind({ category_group_code: "FD6", category_name: "음식점 > 한식" }), null);
  assert.equal(placeKind({ category_group_code: "CE7", category_name: "음식점 > 카페" }), null);
  assert.equal(placeKind({ category_group_code: "PK6", category_name: "교통,수송 > 주차장" }), null);
});

// 카카오 SDK 모양을 흉내 낸 가짜
function fakeMaps({ docs, regions, status = "OK" }) {
  return {
    services: {
      Status: { OK: "OK", ZERO_RESULT: "ZERO_RESULT", ERROR: "ERROR" },
      Places: class { keywordSearch(q, cb) { setTimeout(() => cb(docs, status), 0); } },
      Geocoder: class { coord2RegionCode(x, y, cb) { const r = regions[`${x},${y}`]; setTimeout(() => cb(r ? [{ region_type: "B", code: r.code, address_name: r.name }] : [], "OK"), 0); } },
    },
  };
}
const doc = (name, group, cat, x, y, id = name) => ({ id, place_name: name, category_group_code: group, category_name: cat, address_name: "주소", road_address_name: "도로명 주소", x, y });

test("장소를 찾아 시·군·구 코드 앞 5자리로 바꾼다", async () => {
  const maps = fakeMaps({
    docs: [doc("강남역 2호선", "SW8", "교통,수송 > 지하철,전철", "127.0", "37.4"), doc("강남역 식당", "FD6", "음식점 > 한식", "127.0", "37.4")],
    regions: { "127,37.4": { code: "1168010100", name: "서울특별시 강남구 역삼동" } },
  });
  const known = new Set(["11680"]);
  const list = await searchPlacesWith(maps, "강남역", known);
  assert.equal(list.length, 1);
  assert.deepEqual({ ...list[0] }, { id: "강남역 2호선", name: "강남역", kind: "station", address: "도로명 주소", lat: 37.4, lng: 127, regionCode: "11680" });
});

test("우리 지역 목록에 없는 코드로 바뀐 장소는 빼서, 눌렀을 때 결과가 없는 일이 없게 한다", async () => {
  const maps = fakeMaps({ docs: [doc("어떤 역", "SW8", "교통,수송 > 지하철", "1", "2")], regions: { "1,2": { code: "9999910100", name: "어딘가" } } });
  assert.deepEqual(await searchPlacesWith(maps, "어떤", new Set(["11680"])), []);
});

test("결과가 없으면 빈 목록, 오류는 던진다", async () => {
  assert.deepEqual(await searchPlacesWith(fakeMaps({ docs: [], regions: {}, status: "ZERO_RESULT" }), "없는곳", new Set()), []);
  await assert.rejects(searchPlacesWith(fakeMaps({ docs: [], regions: {}, status: "ERROR" }), "강남", new Set()));
});

test("같은 이름은 한 번만, 최대 5개까지", async () => {
  const docs = Array.from({ length: 9 }, (_, i) => doc(`역${i % 7}`, "SW8", "교통,수송 > 지하철", `${i}`, "0", `id${i}`));
  const regions = Object.fromEntries(docs.map((d) => [`${d.x},0`, { code: "1168010100", name: "서울특별시 강남구" }]));
  const list = await searchPlacesWith(fakeMaps({ docs, regions }), "역", new Set(["11680"]));
  assert.equal(list.length, 5);
  assert.equal(new Set(list.map((p) => p.name)).size, 5);
});

test("역 이름은 호선을 떼고 한 곳으로 줄인다", () => {
  assert.equal(stationBaseName("강남역 2호선"), "강남역");
  assert.equal(stationBaseName("강남역 신분당선"), "강남역");
  assert.equal(stationBaseName("서울역 GTX-A"), "서울역");
  assert.equal(stationBaseName("경복궁"), "경복궁");
  assert.equal(stationBaseName("역"), "역");
});

test("같은 역의 다른 호선은 한 번만 나온다", async () => {
  const same = { code: "1168010100", name: "서울특별시 강남구" };
  const maps = fakeMaps({
    docs: [doc("강남역 2호선", "SW8", "교통,수송 > 지하철", "1", "1"), doc("강남역 신분당선", "SW8", "교통,수송 > 지하철", "2", "2"), doc("강남역 9호선", "SW8", "교통,수송 > 지하철", "3", "3")],
    regions: { "1,1": same, "2,2": same, "3,3": same },
  });
  const list = await searchPlacesWith(maps, "강남역", new Set(["11680"]));
  assert.deepEqual(list.map((p) => p.name), ["강남역"]);
});
