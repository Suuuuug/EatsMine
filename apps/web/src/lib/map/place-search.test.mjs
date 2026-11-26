import assert from "node:assert/strict";
import test from "node:test";
import { MIN_PLACE_QUERY, normalizeQuery, ourRegionCode, placeNote, placeKind, searchPlacesWith, stationBaseName, withEyo, withSubject } from "./place-search.ts";

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

test("장소 종류: 역·명소·문화시설·대학만 쓰고 식당·카페 같은 건 뺀다", () => {
  assert.equal(placeKind({ category_group_code: "SW8", category_name: "교통,수송 > 지하철,전철" }), "station");
  assert.equal(placeKind({ category_group_code: "AT4", category_name: "여행 > 관광,명소" }), "landmark");
  assert.equal(placeKind({ category_group_code: "CT1", category_name: "문화,예술 > 박물관" }), "landmark");
  assert.equal(placeKind({ category_group_code: "SC4", category_name: "교육,학문 > 대학교", place_name: "서울대학교" }), "landmark");
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

// 40개 랜드마크 검색(카카오 실제 응답, 11-26)에서 놓치거나 잘못 뽑은 경우
const kind = (name, group, cat, query = "") => placeKind({ category_group_code: group, category_name: cat, place_name: name }, query);

test("공항·터미널은 분류 코드가 없어서 이름으로 찾는다(주차장·렌트카는 제외)", () => {
  assert.equal(kind("제주국제공항", "", "교통,수송 > 교통시설"), "station");
  assert.equal(kind("인천국제공항 제1여객터미널", "", "교통,수송 > 교통시설"), "station");
  assert.equal(kind("서울 고속버스터미널", "", "교통,수송 > 교통시설"), "station");
  assert.equal(kind("김포국제공항 국내선 제1주차장", "PK6", "교통,수송 > 교통시설"), null);
  assert.equal(kind("제주공항렌트카 본사", "", "서비스,산업 > 전문대행"), null);
  assert.equal(kind("에스케이제주공항충전소", "OL7", "교통,수송 > 자동차"), null);
  assert.equal(kind("공항 앞 버스 정류장", "", "교통,수송 > 교통시설"), null);
});

test("기차역은 분류가 '기차,철도'다", () => {
  assert.equal(kind("부산역", "", "교통,수송 > 기차,철도"), "station");
  assert.equal(kind("대전역 동광장", "", "여행 > 관광,명소"), "landmark");
});

test("시장·공원·문화시설은 코드가 없어도 랜드마크다", () => {
  assert.equal(kind("광장시장", "", "가정,생활 > 시장"), "landmark");
  assert.equal(kind("여의도공원", "", "여행 > 공원"), "landmark");
  assert.equal(kind("동대문디자인플라자", "", "문화,예술 > 문화시설"), "landmark");
});

test("영화관은 랜드마크가 아니다(롯데월드 검색에서 롯데시네마가 뽑히던 문제)", () => {
  assert.equal(kind("롯데시네마 월드타워", "CT1", "문화,예술 > 영화,영상"), null);
  assert.equal(kind("국립중앙박물관", "CT1", "문화,예술 > 문화시설"), "landmark");
});

test("학교는 대학만 쓴다(초·중·고 수백 곳이 섞이지 않게)", () => {
  assert.equal(kind("서울대학교 관악캠퍼스", "SC4", "교육,학문 > 학교"), "landmark");
  assert.equal(kind("역삼초등학교", "SC4", "교육,학문 > 학교"), null);
  assert.equal(kind("서울고등학교", "SC4", "교육,학문 > 학교"), null);
});

test("숙박·주차장·식당·카페·병원은 어떤 경우에도 뺀다", () => {
  for (const [group, cat] of [["AD5", "여행 > 숙박"], ["PK6", "교통,수송 > 교통시설"], ["FD6", "음식점 > 한식"], ["CE7", "음식점 > 카페"], ["HP8", "의료,건강 > 병원"]])
    assert.equal(kind("롯데월드", group, cat, "롯데월드"), null, group);
});

test("이름이 검색어와 정확히 같으면 분류가 없어도 받아 준다(불국사, 롯데월드타워)", () => {
  assert.equal(kind("불국사", "", "문화,예술 > 종교", "불국사"), "landmark");
  assert.equal(kind("롯데월드타워", "", "부동산 > 빌딩", "롯데월드타워"), "landmark");
  assert.equal(kind("롯데월드타워", "", "부동산 > 빌딩", "롯데월드 타워"), "landmark"); // 띄어쓰기는 무시
  assert.equal(kind("강남교회", "", "문화,예술 > 종교", "강남"), null); // 일부만 같으면 안 받는다
  assert.equal(kind("DDP패션몰", "", "부동산 > 빌딩", "DDP"), null);
});

test("공항도 같은 곳의 다른 이름은 한 곳으로 줄인다", () => {
  assert.equal(stationBaseName("김포국제공항 국내선"), "김포국제공항");
  assert.equal(stationBaseName("인천국제공항 제1여객터미널"), "인천국제공항");
  assert.equal(stationBaseName("부산역 부산1호선"), "부산역");
});

test("일반구가 있는 시는 구 코드를 시 코드로 바꾼다(성균관대 자연과학캠퍼스는 수원시 장안구 41111 → 수원시 41110)", async () => {
  const docs = [doc("성균관대학교 자연과학캠퍼스", "SC4", "교육,학문 > 학교 > 대학교", "126.97", "37.29")];
  const maps = fakeMaps({ docs, regions: { "126.97,37.29": { code: "4111110100", name: "경기도 수원시 장안구 천천동" } } });
  const list = await searchPlacesWith(maps, "성균관대 자연과학캠퍼스", new Set(["41110", "11680"]));
  assert.equal(list.length, 1);
  assert.equal(list[0].regionCode, "41110");
});

test("일반구 코드의 시 코드도 우리 목록에 없으면 뺀다", async () => {
  const docs = [doc("어떤 대학교", "SC4", "교육,학문 > 학교 > 대학교", "1", "1")];
  const maps = fakeMaps({ docs, regions: { "1,1": { code: "9911110100", name: "어딘가" } } });
  assert.deepEqual(await searchPlacesWith(maps, "어떤 대학교", new Set(["41110"])), []);
});

test("구 단위 지역이 목록에 있으면 그대로 쓴다(서울·부산 등)", async () => {
  const docs = [doc("경복궁", "AT4", "여행 > 관광,명소", "1", "1")];
  const maps = fakeMaps({ docs, regions: { "1,1": { code: "1111011900", name: "서울특별시 종로구" } } });
  assert.equal((await searchPlacesWith(maps, "경복궁", new Set(["11110"])))[0].regionCode, "11110");
});

test("앞쪽 6개 안에서만 고른다: 뒤쪽 관련 없는 결과가 안내를 가리지 않게(가로수길 → 하이스트리트이탈리아)", async () => {
  const shops = Array.from({ length: 7 }, (_, i) => doc(`상점${i}`, "", "가정,생활 > 패션", `${i}`, "0"));
  const docs = [...shops, doc("하이스트리트이탈리아", "", "문화,예술 > 문화시설", "9", "0")];
  const regions = { "9,0": { code: "1168010100", name: "서울특별시 강남구" } };
  assert.deepEqual(await searchPlacesWith(fakeMaps({ docs, regions }), "가로수길", new Set(["11680"])), []);
});

test("법정동 코드를 우리 지역 코드로 바꾸는 규칙", () => {
  const known = new Set(["41110", "11680", "43110", "48120"]);
  assert.equal(ourRegionCode("1168010100", known), "11680");
  assert.equal(ourRegionCode("4111310100", known), "41110"); // 수원 영통구 → 수원시
  assert.equal(ourRegionCode("4311110100", known), "43110"); // 청주 상당구 → 청주시
  assert.equal(ourRegionCode("4812510100", known), "48120"); // 창원 마산합포구 → 창원시
  assert.equal(ourRegionCode("9999910100", known), null);
});
