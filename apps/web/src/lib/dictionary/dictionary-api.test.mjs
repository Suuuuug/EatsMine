import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  fetchMyDictionaryState,
  isValidFoodId,
  mergeFoodDetailWithApi,
  mergeFoodsWithApi,
  normalizeApiBase,
  normalizeRegionRanking,
  paginateItems,
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

test("식당 목록 페이지네이션이 페이지 범위와 5개 페이지 번호 창을 안전하게 계산한다", () => {
  const list = Array.from({ length: 37 }, (_, i) => i + 1);
  const first = paginateItems(list, 0, 5);
  assert.equal(first.page, 1);
  assert.equal(first.totalPages, 8);
  assert.deepEqual(first.items, [1, 2, 3, 4, 5]);
  assert.deepEqual(first.pageNumbers, [1, 2, 3, 4, 5]);

  const mid = paginateItems(list, 5, 5);
  assert.equal(mid.page, 5);
  assert.deepEqual(mid.items, [21, 22, 23, 24, 25]);
  assert.deepEqual(mid.pageNumbers, [3, 4, 5, 6, 7]);

  const last = paginateItems(list, 99, 5);
  assert.equal(last.page, 8);
  assert.deepEqual(last.items, [36, 37]);
  assert.deepEqual(last.pageNumbers, [4, 5, 6, 7, 8]);
});

test("GET /territories가 3위까지 확장되어도 top 배열과 다중 행 형식을 모두 수용한다", () => {
  const withTop = toTerritoryOwnerMap({
    windowDays: 30,
    items: [
      {
        regionCode: "48220",
        ownerId: "u1",
        ownerNickname: "통영왕",
        reviewCount: 9,
        top: [
          { ownerId: "u2", nickname: "굴러버", reviewCount: 6 },
          { ownerId: "u3", nickname: "바다여행", reviewCount: 3 },
        ],
      },
    ],
  });
  assert.equal(withTop.ownersByRegion["48220"].top?.length, 2);
  assert.equal(withTop.ownersByRegion["48220"].top?.[0].nickname, "굴러버");

  const multiRows = toTerritoryOwnerMap({
    windowDays: 30,
    items: [
      { regionCode: "50130", ownerNickname: "서귀포2위", reviewCount: 4 },
      { regionCode: "50130", ownerNickname: "서귀포1위", reviewCount: 8 },
      { regionCode: "50130", ownerNickname: "서귀포3위", reviewCount: 2 },
      { regionCode: "50130", ownerNickname: "서귀포4위", reviewCount: 1 },
    ],
  });
  assert.equal(multiRows.ownersByRegion["50130"].ownerNickname, "서귀포1위");
  assert.deepEqual(
    multiRows.ownersByRegion["50130"].top?.map((c) => c.nickname),
    ["서귀포2위", "서귀포3위"],
  );
});

test("GET /territories/:regionCode/ranking 응답에서 Top 3와 내 순위·1위까지 남은 개수를 계산한다", () => {
  const mk = (position, nickname, reviewCount, isMe = false) => ({
    position,
    nickname,
    rank: "local",
    rankLabel: "동네 미식가",
    avatarUrl: null,
    reviewCount,
    isMe,
  });

  // 3위 밖(5위)에 있는 로그인 사용자
  const outOfTop3 = normalizeRegionRanking({
    region: { code: "48220", fullName: "경상남도 통영시" },
    windowDays: 30,
    items: [
      mk(2, "둘째", 7),
      mk(1, "통영왕", 10),
      mk(4, "넷째", 3),
      mk(3, "셋째", 5),
    ],
    me: mk(5, "나", 2, true),
  });
  assert.equal(outOfTop3.windowDays, 30);
  assert.deepEqual(
    outOfTop3.items.map((i) => `${i.position}:${i.nickname}`),
    ["1:통영왕", "2:둘째", "3:셋째"],
  );
  assert.deepEqual(outOfTop3.standing, { rank: 5, toFirst: 9 });

  // 내가 이미 1위인 경우
  const first = normalizeRegionRanking({
    region: { code: "48220", fullName: "경상남도 통영시" },
    windowDays: 30,
    items: [mk(1, "나", 8, true), mk(2, "둘째", 4)],
    me: mk(1, "나", 8, true),
  });
  assert.deepEqual(first.standing, { rank: 1, toFirst: 0 });

  // 비로그인(me: null) 및 빈 지역
  const guest = normalizeRegionRanking({
    region: { code: "48220", fullName: "경상남도 통영시" },
    windowDays: 30,
    items: [],
    me: null,
  });
  assert.equal(guest.items.length, 0);
  assert.equal(guest.standing, null);
});

test("isValidFoodId는 양의 정수 음식 ID만 허용해 미확보 시 지역 전체 오조회를 막는다", () => {
  assert.equal(isValidFoodId(1), true);
  assert.equal(isValidFoodId(43), true);
  assert.equal(isValidFoodId(null), false);
  assert.equal(isValidFoodId(undefined), false);
  assert.equal(isValidFoodId(0), false);
  assert.equal(isValidFoodId(-3), false);
  assert.equal(isValidFoodId(1.5), false);
});

test("fetchMyDictionaryState는 정상(ok)·인증 만료(401)·서버 오류(예외)를 명확히 구분한다", async () => {
  const originalFetch = globalThis.fetch;
  try {
    // 200 정상 응답 (GET /me의 reviewCount 사용)
    globalThis.fetch = async (url) => {
      if (String(url).endsWith("/me")) {
        return new Response(
          JSON.stringify({
            id: "u1",
            nickname: "통영미식가",
            rank: "local",
            rankLabel: "동네 미식가",
            avatarUrl: null,
            reviewCount: 7,
            createdAt: "2026-11-25T00:00:00.000Z",
          }),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify({
          count: 1,
          total: 43,
          items: [{ foodId: 2, foodName: "굴", imageUrl: null, collectedAt: "2026-11-25T00:00:00.000Z" }],
        }),
        { status: 200 },
      );
    };
    const okRes = await fetchMyDictionaryState("https://api.example.com", "token-1");
    assert.equal(okRes.status, "ok");
    if (okRes.status === "ok") {
      assert.equal(okRes.data.reviewCount, 7);
      assert.deepEqual(okRes.data.collectedFoodIds, [2]);
    }

    // 401 인증 만료
    globalThis.fetch = async () => new Response("{}", { status: 401 });
    const expiredRes = await fetchMyDictionaryState("https://api.example.com", "expired");
    assert.deepEqual(expiredRes, { status: "unauthorized" });

    // 500 조회 실패는 예외로 전달해 비로그인과 구분
    globalThis.fetch = async () => new Response("{}", { status: 500 });
    await assert.rejects(() =>
      fetchMyDictionaryState("https://api.example.com", "token-1"),
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
