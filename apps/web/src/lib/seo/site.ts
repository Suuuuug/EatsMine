/**
 * EatsMine 검색엔진 최적화(SEO) 공통 메타데이터, 친숙한 국내 여행지 지역명,
 * 전국 16개 시·도 및 대표 국내 여행지 20곳 정의.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://eatsmine.vercel.app"
).replace(/\/$/, "");

export const SITE_NAME = "EatsMine";

export const DEFAULT_TITLE =
  "EatsMine — 전국 국내 여행지 맛집 지도 & 제철음식 도감";

export const DEFAULT_DESCRIPTION =
  "국내 여행 어디로 떠나볼까요? 강원도·제주도·부산·여수·전주·경주 등 전국 230개 여행지별 맛집 지도, 계절별 제철음식 도감, 나만의 여행 영토 기록을 EatsMine에서 한눈에 탐색해 보세요.";

export const SEO_KEYWORDS = [
  "국내 여행",
  "국내 여행지 추천",
  "여행지 맛집",
  "전국 맛집 지도",
  "지역별 맛집",
  "제철음식 여행",
  "제철음식 도감",
  "미식 여행",
  "주말 여행지",
  "현지인 맛집",
  "서울 여행",
  "부산 여행",
  "강원도 여행",
  "강릉 여행",
  "속초 여행",
  "제주도 여행",
  "여수 여행",
  "전주 여행",
  "경주 여행",
  "통영 여행",
  "포항 여행",
  "EatsMine",
  "잇츠마인",
];

export type TravelProvinceSeo = {
  code: string;
  /** 화면과 검색 제목에 쓰는 친숙한 여행지 지역명 (예: 강원도, 제주도, 전남·광주) */
  displayName: string;
  /** 공식 행정구역명 (예: 강원특별자치도, 제주특별자치도) */
  officialName: string;
  summary: string;
  /** 지역 검색 자동완성에 포함할 별칭 목록 */
  searchAliases: readonly string[];
};

export type TravelDestinationSeo = {
  code: string;
  provinceCode: string;
  /** 여행지 대표 명칭 (예: 강릉, 부산 해운대, 제주) */
  name: string;
  /** 시·군·구 이름 (예: 강릉시, 해운대구, 제주시) */
  districtName: string;
  /** 친숙한 전체 지역 표기 (예: 강원도 강릉시) */
  regionLabel: string;
  summary: string;
};

/** 전국 16개 시·도 친숙한 여행지 명칭 및 검색 별칭 */
export const TRAVEL_PROVINCES: readonly TravelProvinceSeo[] = [
  {
    code: "11",
    displayName: "서울",
    officialName: "서울특별시",
    summary: "명동·을지로·종로·강남·성수 등 서울 25개 구 노포와 트렌디 맛집 여행 지도",
    searchAliases: ["서울", "서울특별시", "서울 여행"],
  },
  {
    code: "26",
    displayName: "부산",
    officialName: "부산광역시",
    summary: "해운대·광안리·남포동·기장 바다 전망과 돼지국밥·밀면·회 부산 여행 맛집 지도",
    searchAliases: ["부산", "부산광역시", "부산 여행"],
  },
  {
    code: "27",
    displayName: "대구",
    officialName: "대구광역시",
    summary: "막창·뭉티기·동성로·수성못 골목 미식을 즐길 수 있는 대구 여행 맛집 지도",
    searchAliases: ["대구", "대구광역시", "대구 여행"],
  },
  {
    code: "28",
    displayName: "인천",
    officialName: "인천광역시",
    summary: "차이나타운·송도·강화도·영종도 서해 바다와 함께하는 인천 여행 맛집 지도",
    searchAliases: ["인천", "인천광역시", "인천 여행"],
  },
  {
    code: "30",
    displayName: "대전",
    officialName: "대전광역시",
    summary: "성심당 빵지순례와 칼국수·두부두루치기 등 대전 당일치기 미식 여행 지도",
    searchAliases: ["대전", "대전광역시", "대전 여행"],
  },
  {
    code: "31",
    displayName: "울산",
    officialName: "울산광역시",
    summary: "간절곶·대왕암·언양불고기와 동해 해산물을 만나는 울산 여행 맛집 지도",
    searchAliases: ["울산", "울산광역시", "울산 여행"],
  },
  {
    code: "36",
    displayName: "세종",
    officialName: "세종특별자치시",
    summary: "호수공원·금강 수변과 카페·한정식을 즐길 수 있는 세종 여행 맛집 지도",
    searchAliases: ["세종", "세종시", "세종특별자치시", "세종 여행"],
  },
  {
    code: "41",
    displayName: "경기도",
    officialName: "경기도",
    summary: "수원·파주·양평·가평·용인 등 수도권 근교 주말 나들이 경기도 여행 맛집 지도",
    searchAliases: ["경기", "경기도", "경기도 여행"],
  },
  {
    code: "51",
    displayName: "강원도",
    officialName: "강원특별자치도",
    summary: "강릉·속초·춘천·양양·평창 동해 바다와 산간 제철음식을 즐기는 강원도 여행 맛집 지도",
    searchAliases: ["강원", "강원도", "강원특별자치도", "강원도 여행"],
  },
  {
    code: "43",
    displayName: "충북",
    officialName: "충청북도",
    summary: "단양·제천·청주·충주 호반 풍경과 마늘·향토 요리를 즐기는 충북 여행 맛집 지도",
    searchAliases: ["충북", "충청북도", "충북 여행"],
  },
  {
    code: "44",
    displayName: "충남",
    officialName: "충청남도",
    summary: "태안·보령·논산·공주·부여 서해안 꽃게·대하와 역사 미식 충남 여행 맛집 지도",
    searchAliases: ["충남", "충청남도", "충남 여행"],
  },
  {
    code: "52",
    displayName: "전북",
    officialName: "전북특별자치도",
    summary: "전주 한옥마을·군산·남원·부안 전통 한정식과 비빔밥 전북 여행 맛집 지도",
    searchAliases: ["전북", "전라북도", "전북특별자치도", "전북 여행"],
  },
  {
    code: "12",
    displayName: "전남·광주",
    officialName: "전남광주통합특별시",
    summary: "여수·순천·목포·담양·광주 남도 한정식과 게장·꼬막·떡갈비 전남·광주 여행 맛집 지도",
    searchAliases: [
      "전남",
      "전라남도",
      "광주",
      "광주광역시",
      "전남·광주",
      "전남광주통합특별시",
      "전남 여행",
      "광주 여행",
    ],
  },
  {
    code: "47",
    displayName: "경북",
    officialName: "경상북도",
    summary: "경주·포항·안동·영덕·울릉도 역사와 동해 대게·물회 미식 경북 여행 맛집 지도",
    searchAliases: ["경북", "경상북도", "경북 여행"],
  },
  {
    code: "48",
    displayName: "경남",
    officialName: "경상남도",
    summary: "통영·거제·남해·진주·창원 한려수도 해산물과 남해안 경남 여행 맛집 지도",
    searchAliases: ["경남", "경상남도", "경남 여행"],
  },
  {
    code: "50",
    displayName: "제주도",
    officialName: "제주특별자치도",
    summary: "제주시·서귀포 흑돼지·갈치·고기국수·방어·감귤을 만나는 제주도 여행 맛집 지도",
    searchAliases: ["제주", "제주도", "제주특별자치도", "제주도 여행", "제주 여행"],
  },
];

/** 홈 구조화 데이터(JSON-LD)와 SSR 여행지 인덱스에 노출할 전국 대표 국내 여행지 20곳 */
export const POPULAR_TRAVEL_DESTINATIONS: readonly TravelDestinationSeo[] = [
  {
    code: "51150",
    provinceCode: "51",
    name: "강릉",
    districtName: "강릉시",
    regionLabel: "강원도 강릉시",
    summary: "동해 바다와 커피·초당순두부·해산물 미식 여행지",
  },
  {
    code: "51210",
    provinceCode: "51",
    name: "속초",
    districtName: "속초시",
    regionLabel: "강원도 속초시",
    summary: "설악산과 속초 중앙시장·오징어·대게 먹거리 여행지",
  },
  {
    code: "51110",
    provinceCode: "51",
    name: "춘천",
    districtName: "춘천시",
    regionLabel: "강원도 춘천시",
    summary: "호반 도시와 닭갈비·막국수 당일치기 국내 여행지",
  },
  {
    code: "26350",
    provinceCode: "26",
    name: "부산 해운대",
    districtName: "해운대구",
    regionLabel: "부산 해운대구",
    summary: "해운대 해변과 회·돼지국밥·오션뷰 카페 여행지",
  },
  {
    code: "26500",
    provinceCode: "26",
    name: "부산 광안리",
    districtName: "수영구",
    regionLabel: "부산 수영구",
    summary: "광안대교 야경과 수변 맛집·브런치 여행지",
  },
  {
    code: "50110",
    provinceCode: "50",
    name: "제주",
    districtName: "제주시",
    regionLabel: "제주도 제주시",
    summary: "흑돼지·고기국수·갈치·귤 제철음식 대표 여행지",
  },
  {
    code: "50130",
    provinceCode: "50",
    name: "서귀포",
    districtName: "서귀포시",
    regionLabel: "제주도 서귀포시",
    summary: "올레길과 방어·해산물·감귤 미식 여행지",
  },
  {
    code: "12130",
    provinceCode: "12",
    name: "여수",
    districtName: "여수시",
    regionLabel: "전남·광주 여수시",
    summary: "여수 밤바다와 게장·갓김치·새조개 남해 여행지",
  },
  {
    code: "12150",
    provinceCode: "12",
    name: "순천",
    districtName: "순천시",
    regionLabel: "전남·광주 순천시",
    summary: "순천만 습지와 꼬막정식·남도 한정식 여행지",
  },
  {
    code: "52110",
    provinceCode: "52",
    name: "전주",
    districtName: "전주시",
    regionLabel: "전북 전주시",
    summary: "한옥마을과 비빔밥·콩나물국밥 전통 미식 여행지",
  },
  {
    code: "47130",
    provinceCode: "47",
    name: "경주",
    districtName: "경주시",
    regionLabel: "경북 경주시",
    summary: "황리단길과 유적지·한정식·디저트 역사 여행지",
  },
  {
    code: "47110",
    provinceCode: "47",
    name: "포항",
    districtName: "포항시",
    regionLabel: "경북 포항시",
    summary: "영일대와 과메기·물회·대게 동해안 여행지",
  },
  {
    code: "47170",
    provinceCode: "47",
    name: "안동",
    districtName: "안동시",
    regionLabel: "경북 안동시",
    summary: "하회마을과 찜닭·간고등어 전통 문화 여행지",
  },
  {
    code: "48220",
    provinceCode: "48",
    name: "통영",
    districtName: "통영시",
    regionLabel: "경남 통영시",
    summary: "한려수도와 굴·충무김밥·해산물 항구 여행지",
  },
  {
    code: "48310",
    provinceCode: "48",
    name: "거제",
    districtName: "거제시",
    regionLabel: "경남 거제시",
    summary: "남해 바다 전망과 멍게비빔밥·횟집 섬 여행지",
  },
  {
    code: "44825",
    provinceCode: "44",
    name: "태안",
    districtName: "태안군",
    regionLabel: "충남 태안군",
    summary: "서해안 해변과 꽃게·대하·달래 제철 미식 여행지",
  },
  {
    code: "44230",
    provinceCode: "44",
    name: "논산",
    districtName: "논산시",
    regionLabel: "충남 논산시",
    summary: "봄 딸기 축제와 충청 향토 음식 여행지",
  },
  {
    code: "11140",
    provinceCode: "11",
    name: "서울 중구",
    districtName: "중구",
    regionLabel: "서울 중구",
    summary: "명동·을지로·남산 도심 노포 맛집 여행지",
  },
  {
    code: "11110",
    provinceCode: "11",
    name: "서울 종로",
    districtName: "종로구",
    regionLabel: "서울 종로구",
    summary: "북촌·서촌·광장시장 전통 골목 미식 여행지",
  },
  {
    code: "11680",
    provinceCode: "11",
    name: "서울 강남",
    districtName: "강남구",
    regionLabel: "서울 강남구",
    summary: "가로수길·삼성·청담 트렌디 다이닝 여행지",
  },
];

const PROVINCE_BY_CODE = new Map(TRAVEL_PROVINCES.map((p) => [p.code, p]));

/** 시·도 코드에 해당하는 친숙한 여행지 지역명(예: 51 → 강원도)을 반환한다. */
export function getTravelProvinceName(code: string, fallback = ""): string {
  return PROVINCE_BY_CODE.get(code)?.displayName ?? fallback;
}

/** 시·도 + 시·군·구를 친숙한 여행지 표기(예: 강원도 강릉시, 세종)로 조합한다. */
export function formatTravelFullName(
  parentCode: string,
  districtName: string,
): string {
  if (parentCode === "36") return "세종";
  const provinceName = getTravelProvinceName(parentCode);
  return provinceName ? `${provinceName} ${districtName}` : districtName;
}

/** 친숙한 여행지 지역명 기준으로 가나다순 정렬한다. */
export function sortProvincesByTravelName<
  T extends { code: string; name: string },
>(provinces: readonly T[]): T[] {
  return [...provinces].sort((a, b) =>
    getTravelProvinceName(a.code, a.name).localeCompare(
      getTravelProvinceName(b.code, b.name),
      "ko",
    ),
  );
}

/** 자동완성 검색에서 친숙한 지역명과 공식 행정명·별칭을 모두 매칭할 수 있는 검색 텍스트를 만든다. */
export function getRegionSearchText(
  parentCode: string,
  districtName: string,
  fullName: string,
): string {
  const province = PROVINCE_BY_CODE.get(parentCode);
  if (!province) return `${fullName} ${districtName}`.toLowerCase();
  return [
    fullName,
    districtName,
    province.displayName,
    province.officialName,
    ...province.searchAliases,
  ]
    .join(" ")
    .toLowerCase();
}

/** JSON-LD 직렬화 시 script 태그 탈출을 방지한다. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
