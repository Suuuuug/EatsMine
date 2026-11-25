/** 백엔드 GET /regions, GET /regions/popular 항목 */
export type RegionItem = {
  code: string;
  name: string;
  fullName: string;
  centerLat: number | null;
  centerLng: number | null;
};

/** 백엔드 GET /genres 응답 */
export type GenreCatalog = {
  major: string[];
  minor: string[];
};

/** 백엔드 GET /foods 항목 */
export type ApiFoodItem = {
  id: number;
  name: string;
  description: string;
  imageUrl: string | null;
  months: number[];
};

/** 백엔드 GET /foods/:id 상세 응답 */
export type ApiFoodDetail = ApiFoodItem & {
  sourceUrl: string | null;
  regions: { code: string; fullName: string; reason: string }[];
  genres: string[];
};

/** 백엔드 잇플 매장 항목 (EatplPlace) */
export type EatplPlace = {
  id: string;
  name: string;
  address: string;
  genre: string | null;
  rankNational: number | null;
  rankLocal: number | null;
  isLocalFavorite: boolean;
  estimatedHours: { start: string; end: string } | null;
  holidays: string[];
  busiest: { day: string | null; time: string | null } | null;
  topCustomers: string[];
  foreignerVisits: boolean;
  groupDining: boolean;
  lat: number | null;
  lng: number | null;
  merUrl: string;
  /** 식당 대표 이미지 (추후 연동 시 사용, 미제공 시 빈 이미지 슬롯 표시) */
  imageUrl?: string | null;
};

export type MatchedBy = "keyword" | "genre";

/** 백엔드 GET /restaurants 응답 */
export type RestaurantSearchResult = {
  region: { code: string; fullName: string };
  food?: { id: number; name: string };
  matchedBy?: MatchedBy;
  items: EatplPlace[];
  source: string;
  fetchedAt: string;
  /** 백엔드 미연결 시 예시 폴백 표시 여부 */
  isFallback?: boolean;
};

/** 백엔드 GET /territories 항목 */
export type TerritoryOwner = {
  regionCode: string;
  ownerNickname: string;
  reviewCount: number;
};

export type TerritoryOwnersResponse = {
  windowDays: number;
  items: TerritoryOwner[];
};

export type OutboundPlacement = "list" | "map" | "share";
