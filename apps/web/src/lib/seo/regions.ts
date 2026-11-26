import rawRegionCodes from "../../../public/images/maps/region-codes.json" with { type: "json" };
import rawDictionaryFoods from "../../data/dictionary-foods.json" with { type: "json" };
import type { RegionItem } from "../../types/map.ts";
import {
  POPULAR_TRAVEL_DESTINATIONS,
  SITE_NAME,
  SITE_URL,
  TRAVEL_PROVINCES,
  formatTravelFullName,
  getTravelProvinceName,
} from "./site.ts";

type RawTerritory = {
  code: string;
  name: string;
  parentCode?: string;
  labelPoint?: number[];
};

type RawRegionCodes = {
  provinces: { code: string; name: string }[];
  territories: RawTerritory[];
};

type RawDictionaryFood = {
  name: string;
  months: number[];
  description: string;
  regions: { code: string; name: string; reason: string }[];
  searchKeyword: string;
};

export type RegionSeoEntry = {
  code: string;
  /** 시·군·구 이름 (예: 강릉시, 중구) */
  name: string;
  /** 상위 시·도 코드 (예: 51) */
  parentCode: string;
  /** 친숙한 시·도 이름 (예: 강원도, 전남·광주) */
  provinceName: string;
  /** 공식 행정구역 시·도 이름 (예: 강원특별자치도) */
  provinceOfficialName: string;
  /** 친숙한 전체 지역 표기 (예: 강원도 강릉시, 세종) */
  fullName: string;
  centerLat: number | null;
  centerLng: number | null;
  /** 대표 국내 여행지 20곳 포함 여부 */
  isPopular: boolean;
  /** 대표 여행지 약칭 (예: 강릉, 부산 해운대) */
  popularName: string | null;
  /** 검색엔진 설명 및 안내용 요약 문구 */
  summary: string;
};

export type RegionSeasonalFood = {
  name: string;
  months: readonly number[];
  description: string;
  reason: string;
};

export type RegionSeoMeta = {
  title: string;
  description: string;
  canonicalPath: string;
  canonicalUrl: string;
  keywords: string[];
};

const PROVINCE_BY_CODE = new Map(TRAVEL_PROVINCES.map((p) => [p.code, p]));
const POPULAR_BY_CODE = new Map(
  POPULAR_TRAVEL_DESTINATIONS.map((d) => [d.code, d]),
);

const regionData = rawRegionCodes as RawRegionCodes;
const foodData = rawDictionaryFoods as RawDictionaryFood[];

/** 전국 230개 시·군·구 정적 SEO 메타 목록 */
export const ALL_REGIONS: readonly RegionSeoEntry[] = regionData.territories.map(
  (territory) => {
    const parentCode = territory.parentCode ?? territory.code.slice(0, 2);
    const province = PROVINCE_BY_CODE.get(parentCode);
    const popular = POPULAR_BY_CODE.get(territory.code);
    const provinceName = getTravelProvinceName(parentCode, province?.officialName ?? "");
    const fullName = formatTravelFullName(parentCode, territory.name);
    const [lng, lat] = territory.labelPoint ?? [null, null];

    const summary = popular
      ? popular.summary
      : `${fullName} 여행 맛집 지도와 현지 인기 식당, 공유 영토 순위를 한눈에 탐색할 수 있는 국내 여행지`;

    return {
      code: territory.code,
      name: territory.name,
      parentCode,
      provinceName,
      provinceOfficialName: province?.officialName ?? provinceName,
      fullName,
      centerLat: typeof lat === "number" ? lat : null,
      centerLng: typeof lng === "number" ? lng : null,
      isPopular: Boolean(popular),
      popularName: popular?.name ?? null,
      summary,
    };
  },
);

const REGION_BY_CODE = new Map(ALL_REGIONS.map((r) => [r.code, r]));

const FOODS_BY_REGION = (() => {
  const map = new Map<string, RegionSeasonalFood[]>();
  for (const food of foodData) {
    for (const region of food.regions) {
      const list = map.get(region.code) ?? [];
      list.push({
        name: food.name,
        months: food.months,
        description: food.description,
        reason: region.reason,
      });
      map.set(region.code, list);
    }
  }
  return map;
})();

const REGIONS_BY_PROVINCE = (() => {
  const map = new Map<string, RegionSeoEntry[]>();
  for (const region of ALL_REGIONS) {
    const list = map.get(region.parentCode) ?? [];
    list.push(region);
    map.set(region.parentCode, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name, "ko"));
  }
  return map;
})();

/** 지역 전용 페이지의 정규 경로(`/regions/[regionCode]`)를 반환한다. */
export function regionPath(regionCode: string): string {
  return `/regions/${encodeURIComponent(regionCode)}`;
}

/** 예시 모드(`?preview=1`)가 켜져 있으면 유지한 지역 경로를 반환한다. */
export function regionHref(regionCode: string, preservePreview = false): string {
  const base = regionPath(regionCode);
  return preservePreview ? `${base}?preview=1` : base;
}

/** 시·군·구 코드로 지역 메타 정보를 조회한다. 없는 코드면 null을 반환한다. */
export function getRegionByCode(regionCode: string): RegionSeoEntry | null {
  return REGION_BY_CODE.get(regionCode.trim()) ?? null;
}

/** SEO 지역 메타를 지도 탐색기(`MapExplorerClient`)용 `RegionItem`으로 변환한다. */
export function toRegionItem(region: RegionSeoEntry): RegionItem {
  return {
    code: region.code,
    name: region.name,
    fullName: region.fullName,
    centerLat: region.centerLat,
    centerLng: region.centerLng,
  };
}

/** 해당 지역이 추천 산지로 등록된 제철음식 목록을 반환한다. */
export function getFoodsForRegion(
  regionCode: string,
): readonly RegionSeasonalFood[] {
  return FOODS_BY_REGION.get(regionCode) ?? [];
}

/** 같은 시·도에 속한 다른 시·군·구 여행지 목록을 가나다순으로 반환한다. */
export function getSiblingRegions(
  regionCode: string,
): readonly RegionSeoEntry[] {
  const current = REGION_BY_CODE.get(regionCode);
  if (!current) return [];
  const group = REGIONS_BY_PROVINCE.get(current.parentCode) ?? [];
  return group.filter((r) => r.code !== regionCode);
}

/**
 * 시·도 코드의 대표 진입 지역을 반환한다.
 * 홈 크롤러 인덱스에서 16개 시·도 전체가 2-hop 내부 링크로 연결되도록 보장한다.
 */
export function getProvinceEntryRegion(
  provinceCode: string,
): RegionSeoEntry | null {
  const popular = POPULAR_TRAVEL_DESTINATIONS.find(
    (d) => d.provinceCode === provinceCode,
  );
  if (popular) {
    const matched = REGION_BY_CODE.get(popular.code);
    if (matched) return matched;
  }
  const group = REGIONS_BY_PROVINCE.get(provinceCode);
  return group?.[0] ?? null;
}

/** 지역별 전용 페이지의 고유 SEO 메타데이터를 생성한다. */
export function getRegionSeoMeta(region: RegionSeoEntry): RegionSeoMeta {
  const foods = getFoodsForRegion(region.code);
  const canonicalPath = regionPath(region.code);
  const canonicalUrl = `${SITE_URL}${canonicalPath}`;
  const title = `${region.fullName} 여행 맛집 지도 · 제철음식 | ${SITE_NAME}`;

  const foodHighlight =
    foods.length > 0
      ? ` ${foods.map((f) => f.name).join("·")} 등 제철음식과`
      : "";
  const description = `${region.fullName} 맛집 지도 — ${region.summary}.${foodHighlight} 현지 인기 식당·업종 필터·리뷰·공유 영토를 ${SITE_NAME}에서 확인해 보세요.`;

  const keywords = [
    `${region.fullName} 맛집`,
    `${region.fullName} 여행`,
    `${region.name} 맛집`,
    `${region.name} 여행`,
    `${region.provinceName} 여행`,
    `${region.provinceName} 맛집`,
    ...foods.map((f) => `${region.name} ${f.name}`),
    ...(region.popularName ? [`${region.popularName} 맛집`, `${region.popularName} 여행`] : []),
    "국내 여행 맛집 지도",
    SITE_NAME,
  ];

  return {
    title,
    description,
    canonicalPath,
    canonicalUrl,
    keywords: [...new Set(keywords)],
  };
}

/** 지역별 전용 페이지의 JSON-LD(BreadcrumbList + TouristDestination)를 생성한다. */
export function buildRegionJsonLd(
  region: RegionSeoEntry,
  foods: readonly RegionSeasonalFood[],
) {
  const meta = getRegionSeoMeta(region);
  const geo =
    region.centerLat != null && region.centerLng != null
      ? {
          "@type": "GeoCoordinates",
          latitude: region.centerLat,
          longitude: region.centerLng,
        }
      : undefined;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "전국 맛집 지도",
            item: SITE_URL,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: region.fullName,
            item: meta.canonicalUrl,
          },
        ],
      },
      {
        "@type": "TouristDestination",
        "@id": `${meta.canonicalUrl}#destination`,
        name: region.fullName,
        alternateName: region.popularName ?? region.name,
        description: meta.description,
        url: meta.canonicalUrl,
        inLanguage: "ko-KR",
        touristType: ["미식 여행", "국내 여행"],
        ...(geo ? { geo } : {}),
        containedInPlace: {
          "@type": "AdministrativeArea",
          name: region.provinceOfficialName,
        },
        ...(foods.length > 0
          ? {
              keywords: foods.map((f) => f.name).join(", "),
            }
          : {}),
      },
    ],
  };
}
