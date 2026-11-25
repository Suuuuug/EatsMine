import type {
  EatplPlace,
  GenreCatalog,
  RegionItem,
  RestaurantSearchResult,
  TerritoryOwner,
} from "@/types/map";

/** 기본 시작 지역 (서울특별시 중구) */
export const DEFAULT_REGION: RegionItem = {
  code: "11140",
  name: "중구",
  fullName: "서울특별시 중구",
  centerLat: 37.5597,
  centerLng: 127.0017,
};

/** 빠른 필터에 우선 노출할 주요 업종 */
export const QUICK_GENRES = [
  "일반한식",
  "해산물구이/찜",
  "고기구이",
  "찜/탕/찌개",
  "일식회집",
  "국수/면/만두",
  "카페",
  "빵/도넛",
  "분식",
  "주점",
] as const;

/** 백엔드 업종 43종과 동일한 분류 목록 (후속 API 연동 시 그대로 매칭) */
export const MOCK_GENRES: GenreCatalog = {
  major: [
    "일반한식",
    "서양음식",
    "스넥",
    "중국음식",
    "일식회집",
    "주점",
    "칵테일바",
    "갈비전문점",
    "한정식",
  ],
  minor: [
    "카페",
    "고기구이",
    "찜/탕/찌개",
    "치킨",
    "국수/면/만두",
    "해산물구이/찜",
    "김밥전문점",
    "분식",
    "기타외국식",
    "곱창전골/구이",
    "피자",
    "족발/보쌈",
    "버거",
    "스시/초밥",
    "브런치카페/샐러드",
    "떡볶이전문점",
    "빵/도넛",
    "도시락/죽",
    "일식돈가스",
    "뷔페",
    "마라탕",
    "이탈리아음식",
    "샌드위치/토스트",
    "양꼬치",
    "아시안",
    "아이스크림/요거트/빙수",
    "전/부침개",
    "기타베이커리",
    "일식라멘",
    "멕시칸",
    "떡/한과",
    "프랑스음식",
    "비건/채식/사찰",
    "기타",
  ],
};

/** 도감(/dictionary)의 /?food={slug} 진입 시 연결할 대표 산지·추천 업종 (예시) */
export const FOOD_SLUG_PRESETS: Record<
  string,
  {
    label: string;
    regionCode: string;
    regionFullName: string;
    centerLat: number;
    centerLng: number;
    genre: string;
  }
> = {
  strawberry: {
    label: "딸기",
    regionCode: "44230",
    regionFullName: "충청남도 논산시",
    centerLat: 36.1774,
    centerLng: 127.1503,
    genre: "카페",
  },
  "wild-greens": {
    label: "냉이",
    regionCode: "44800",
    regionFullName: "충청남도 홍성군",
    centerLat: 36.5543,
    centerLng: 126.6555,
    genre: "일반한식",
  },
  chives: {
    label: "달래",
    regionCode: "44825",
    regionFullName: "충청남도 태안군",
    centerLat: 36.7845,
    centerLng: 126.233,
    genre: "일반한식",
  },
  crab: {
    label: "꽃게",
    regionCode: "44825",
    regionFullName: "충청남도 태안군",
    centerLat: 36.7845,
    centerLng: 126.233,
    genre: "해산물구이/찜",
  },
  asparagus: {
    label: "아스파라거스",
    regionCode: "51800",
    regionFullName: "강원특별자치도 양구군",
    centerLat: 38.1905,
    centerLng: 127.989,
    genre: "서양음식",
  },
  watermelon: {
    label: "수박",
    regionCode: "52790",
    regionFullName: "전북특별자치도 고창군",
    centerLat: 35.4357,
    centerLng: 126.6098,
    genre: "카페",
  },
  peach: {
    label: "복숭아",
    regionCode: "41500",
    regionFullName: "경기도 이천시",
    centerLat: 37.2555,
    centerLng: 127.438,
    genre: "카페",
  },
  corn: {
    label: "옥수수",
    regionCode: "51150",
    regionFullName: "강원특별자치도 강릉시",
    centerLat: 37.6867,
    centerLng: 128.8861,
    genre: "카페",
  },
  tomato: {
    label: "토마토",
    regionCode: "41610",
    regionFullName: "경기도 광주시",
    centerLat: 37.4159,
    centerLng: 127.2912,
    genre: "브런치카페/샐러드",
  },
  cucumber: {
    label: "오이",
    regionCode: "44130",
    regionFullName: "충청남도 천안시",
    centerLat: 36.8159,
    centerLng: 127.2179,
    genre: "국수/면/만두",
  },
  persimmon: {
    label: "감",
    regionCode: "47820",
    regionFullName: "경상북도 청도군",
    centerLat: 35.6569,
    centerLng: 128.6918,
    genre: "카페",
  },
  shiitake: {
    label: "표고버섯",
    regionCode: "12770",
    regionFullName: "전남광주통합특별시 장흥군",
    centerLat: 34.7619,
    centerLng: 126.9178,
    genre: "일반한식",
  },
  "sweet-potato": {
    label: "고구마",
    regionCode: "12790",
    regionFullName: "전남광주통합특별시 해남군",
    centerLat: 34.5473,
    centerLng: 126.5625,
    genre: "빵/도넛",
  },
  chestnut: {
    label: "밤",
    regionCode: "44150",
    regionFullName: "충청남도 공주시",
    centerLat: 36.5452,
    centerLng: 127.0542,
    genre: "카페",
  },
  pear: {
    label: "배",
    regionCode: "12170",
    regionFullName: "전남광주통합특별시 나주시",
    centerLat: 34.9765,
    centerLng: 126.7838,
    genre: "일반한식",
  },
  mackerel: {
    label: "고등어",
    regionCode: "50110",
    regionFullName: "제주특별자치도 제주시",
    centerLat: 33.4408,
    centerLng: 126.5114,
    genre: "해산물구이/찜",
  },
  yellowtail: {
    label: "방어",
    regionCode: "50130",
    regionFullName: "제주특별자치도 서귀포시",
    centerLat: 33.3367,
    centerLng: 126.6883,
    genre: "일식회집",
  },
  oyster: {
    label: "굴",
    regionCode: "48220",
    regionFullName: "경상남도 통영시",
    centerLat: 34.9209,
    centerLng: 128.3898,
    genre: "해산물구이/찜",
  },
  tangerine: {
    label: "귤",
    regionCode: "50130",
    regionFullName: "제주특별자치도 서귀포시",
    centerLat: 33.3367,
    centerLng: 126.6883,
    genre: "카페",
  },
  radish: {
    label: "무",
    regionCode: "50110",
    regionFullName: "제주특별자치도 제주시",
    centerLat: 33.4408,
    centerLng: 126.5114,
    genre: "찜/탕/찌개",
  },
};

/** 공유 영토 땅따먹기 주인 예시 데이터 (백엔드 GET /territories 연동 전 예시) */
export const MOCK_TERRITORY_OWNERS: TerritoryOwner[] = [
  { regionCode: "11110", ownerNickname: "미식탐험가3102", reviewCount: 7 },
  { regionCode: "11140", ownerNickname: "미식탐험가3102", reviewCount: 5 },
  { regionCode: "11680", ownerNickname: "미식탐험가3102", reviewCount: 4 },
  { regionCode: "51150", ownerNickname: "미식탐험가3102", reviewCount: 3 },
  { regionCode: "26350", ownerNickname: "바다바람4821", reviewCount: 6 },
  { regionCode: "26500", ownerNickname: "바다바람4821", reviewCount: 4 },
  { regionCode: "48220", ownerNickname: "바다바람4821", reviewCount: 5 },
  { regionCode: "52110", ownerNickname: "제철수집가7725", reviewCount: 5 },
  { regionCode: "12130", ownerNickname: "제철수집가7725", reviewCount: 4 },
  { regionCode: "50110", ownerNickname: "제철수집가7725", reviewCount: 6 },
  { regionCode: "44230", ownerNickname: "골목식객1940", reviewCount: 3 },
  { regionCode: "47110", ownerNickname: "골목식객1940", reviewCount: 4 },
];

/** 식당별 공개 리뷰(예시) 타입 — 백엔드 연동 전 프론트 UI용 */
export type PlaceReviewItem = {
  id: string;
  authorNickname: string;
  rating: number;
  content: string;
  visitedAt: string;
  photos?: string[];
  isSample?: boolean;
};

export type PlaceReviewSummary = {
  averageRating: number;
  reviewCount: number;
  featuredReview: PlaceReviewItem;
  reviews: PlaceReviewItem[];
  isSample: boolean;
};

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

const REVIEW_POOL_CAFE = [
  "분위기가 차분하고 디저트가 과하게 달지 않아 좋았어요.",
  "커피 향이 깔끔하고 창가 자리가 여유로워서 재방문 의사 있어요.",
  "주말 오후엔 조금 붐비지만 기다릴 만한 곳이에요.",
];

const REVIEW_POOL_SEAFOOD = [
  "재료가 신선하고 비린 맛 없이 깔끔해서 만족스러웠어요.",
  "현지 분들이 많이 찾는 이유가 있네요. 양도 넉넉합니다.",
  "제철이라 그런지 살이 꽉 차고 맛있었어요.",
];

const REVIEW_POOL_MEAT = [
  "고기 질이 좋고 밑반찬까지 정갈하게 나와서 든든했어요.",
  "직원분들이 친절하고 모임으로 가기에도 편한 분위기예요.",
  "불향이 잘 배어 있어서 밥이랑 먹기 딱 좋았습니다.",
];

const REVIEW_POOL_GENERAL = [
  "음식이 깔끔하고 회전율이 빨라서 점심에 들르기 좋았어요.",
  "동네 단골이 많은 분위기라 믿고 먹을 수 있었어요.",
  "간이 세지 않고 재료 맛이 살아 있어서 또 오고 싶어요.",
];

const SAMPLE_NICKNAMES = [
  "미식탐험가3102",
  "바다바람4821",
  "골목식객1940",
  "제철수집가7725",
  "주말미식가5289",
];

export function getSamplePlaceReviews(
  place: Pick<EatplPlace, "id" | "genre" | "isLocalFavorite">,
  userAddedReviews: PlaceReviewItem[] = [],
): PlaceReviewSummary {
  const seed = hashString(place.id);
  const genre = place.genre ?? "";

  const pool =
    genre.includes("카페") ||
    genre.includes("빵") ||
    genre.includes("빙수") ||
    genre.includes("베이커리")
      ? REVIEW_POOL_CAFE
      : genre.includes("해산물") || genre.includes("회") || genre.includes("스시")
        ? REVIEW_POOL_SEAFOOD
        : genre.includes("고기") ||
            genre.includes("갈비") ||
            genre.includes("곱창")
          ? REVIEW_POOL_MEAT
          : REVIEW_POOL_GENERAL;

  const baseRating1 = place.isLocalFavorite ? 5 : 4 + (seed % 2);
  const baseRating2 = 4 + ((seed >> 2) % 2);
  const baseRating3 = 4;

  const sampleList: PlaceReviewItem[] = [
    {
      id: `sample-${place.id}-1`,
      authorNickname: SAMPLE_NICKNAMES[seed % SAMPLE_NICKNAMES.length],
      rating: baseRating1,
      content: pool[seed % pool.length],
      visitedAt: "2026-11-18",
      isSample: true,
    },
    {
      id: `sample-${place.id}-2`,
      authorNickname: SAMPLE_NICKNAMES[(seed + 2) % SAMPLE_NICKNAMES.length],
      rating: baseRating2,
      content: pool[(seed + 1) % pool.length],
      visitedAt: "2026-11-11",
      isSample: true,
    },
    {
      id: `sample-${place.id}-3`,
      authorNickname: SAMPLE_NICKNAMES[(seed + 4) % SAMPLE_NICKNAMES.length],
      rating: baseRating3,
      content: pool[(seed + 2) % pool.length],
      visitedAt: "2026-11-02",
      isSample: true,
    },
  ];

  const reviews = [...userAddedReviews, ...sampleList];
  const sum = reviews.reduce((acc, item) => acc + item.rating, 0);
  const averageRating = Math.round((sum / reviews.length) * 10) / 10;

  return {
    averageRating,
    reviewCount: reviews.length,
    featuredReview: reviews[0],
    reviews,
    isSample: userAddedReviews.length === 0,
  };
}

const MOCK_PLACE_TEMPLATES: {
  suffix: string;
  street: string;
  genre: string;
  dLat: number;
  dLng: number;
  isLocalFavorite: boolean;
}[] = [
  {
    suffix: "본가 한상",
    street: "중앙로 12",
    genre: "일반한식",
    dLat: 0.0046,
    dLng: -0.0058,
    isLocalFavorite: true,
  },
  {
    suffix: "바다 포구집",
    street: "시장길 48",
    genre: "해산물구이/찜",
    dLat: -0.0038,
    dLng: 0.0054,
    isLocalFavorite: true,
  },
  {
    suffix: "로스터리 카페",
    street: "역전길 21",
    genre: "카페",
    dLat: 0.0022,
    dLng: 0.0072,
    isLocalFavorite: false,
  },
  {
    suffix: "숯불 화로구이",
    street: "번영로 89",
    genre: "고기구이",
    dLat: -0.0055,
    dLng: -0.0042,
    isLocalFavorite: true,
  },
  {
    suffix: "손칼국수",
    street: "문화길 34",
    genre: "국수/면/만두",
    dLat: 0.0064,
    dLng: 0.0018,
    isLocalFavorite: false,
  },
  {
    suffix: "계절 횟집",
    street: "해변로 105",
    genre: "일식회집",
    dLat: -0.0015,
    dLng: -0.0079,
    isLocalFavorite: true,
  },
];

/**
 * 선택한 지역·업종·제철음식에 맞춘 결정론적 예시 매장 생성기 (프론트 단독 동작용).
 * 백엔드 API 연동 시 GET /restaurants 호출로 바로 교체할 수 있도록 동일한 RestaurantSearchResult 타입을 반환한다.
 */
export function buildMockSearchResult(
  region: RegionItem,
  options?: { genres?: readonly string[]; foodLabel?: string | null },
): RestaurantSearchResult {
  const baseLat = region.centerLat ?? DEFAULT_REGION.centerLat!;
  const baseLng = region.centerLng ?? DEFAULT_REGION.centerLng!;
  const shortName = region.name || region.fullName.split(" ").at(-1) || "지역";
  const genres = options?.genres ?? [];
  const foodLabel = options?.foodLabel ?? null;

  const makePlace = (
    tpl: (typeof MOCK_PLACE_TEMPLATES)[number],
    idx: number,
    resolvedGenre: string,
    suffixLabel: string,
    offsetScale = 1,
  ): EatplPlace => {
    const displayName = foodLabel
      ? `${shortName} ${foodLabel} ${idx === 0 ? "전문점" : tpl.suffix}(예시)`
      : `${shortName} ${suffixLabel}(예시)`;

    return {
      id: `mock_${region.code}_${resolvedGenre}_${idx + 1}`,
      name: displayName,
      address: `${region.fullName} ${tpl.street}`,
      genre: resolvedGenre,
      rankNational: Math.round((2.5 + idx * 2.8) * 10) / 10,
      rankLocal: Math.round((1.2 + idx * 2.1) * 10) / 10,
      isLocalFavorite: tpl.isLocalFavorite,
      estimatedHours: { start: "11:00", end: "21:30" },
      holidays: idx % 2 === 0 ? ["월요일"] : [],
      busiest: { day: "토요일", time: "12시~14시" },
      topCustomers: ["30대 여성", "40대 남성", "30대 남성"],
      foreignerVisits: idx === 1,
      groupDining: idx % 2 === 0,
      lat: baseLat + tpl.dLat * offsetScale,
      lng: baseLng + tpl.dLng * offsetScale,
      merUrl: "https://web.paybooc.ai",
    };
  };

  let items: EatplPlace[];
  if (genres.length === 0) {
    items = MOCK_PLACE_TEMPLATES.map((tpl, idx) =>
      makePlace(tpl, idx, tpl.genre, tpl.suffix),
    );
  } else if (genres.length === 1) {
    const g = genres[0];
    const shortGenre = g.split("/")[0];
    items = MOCK_PLACE_TEMPLATES.slice(0, 4).map((tpl, idx) =>
      makePlace(tpl, idx, g, `${shortGenre} ${idx + 1}호점`),
    );
  } else {
    // 다중 업종 필터: 선택한 각 업종별 대표 예시 식당을 골고루 반환 (최대 8곳)
    items = [];
    const perGenre = genres.length <= 3 ? 2 : 1;
    let slot = 0;
    for (const g of genres) {
      const shortGenre = g.split("/")[0];
      for (let i = 0; i < perGenre && items.length < 8; i++) {
        const tpl = MOCK_PLACE_TEMPLATES[slot % MOCK_PLACE_TEMPLATES.length];
        const ringScale = 1 + Math.floor(slot / MOCK_PLACE_TEMPLATES.length) * 0.45;
        items.push(makePlace(tpl, slot, g, `${shortGenre} ${i + 1}호점`, ringScale));
        slot += 1;
      }
    }
  }

  return {
    region: { code: region.code, fullName: region.fullName },
    items,
    source: "예시 데이터 (백엔드 API 연동 전)",
    fetchedAt: new Date().toISOString(),
    isFallback: true,
  };
}
