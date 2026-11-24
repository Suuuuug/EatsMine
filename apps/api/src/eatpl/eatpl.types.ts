/**
 * 잇플 원본 응답 항목 — eatpl 모듈 밖으로 내보내지 않는다 (D3).
 * 필드 의미는 "eat.pl 가맹점 검색 API 정의서" 참고. 값이 빠질 수 있어 모두 optional.
 */
export type EatplRawItem = {
  merNm?: string;
  merAddr?: string;
  merTpno?: string;
  merTpbuzNm?: string | null;
  allSaleRnk?: number | null;
  ccgSaleRnk?: number | null;
  loclPrsnPpltYn?: boolean;
  merUrl?: string;
  srtTime?: string;
  endTime?: string;
  frnrVsitYn?: boolean;
  empyVsitYn?: boolean;
  hldyDwk?: string[];
  congestionDwk?: string;
  congestionTizn?: string;
  vistCstmrRnkList?: { rk01?: string; rk02?: string; rk03?: string };
  xaxsVal?: string;
  yaxsVal?: string;
};

/** 앱 내부에서 쓰는 잇플 매장 정보 (원본 필드명과 분리) */
export type EatplPlace = {
  /** merUrl 끝 고유값 — 매장 식별자 */
  id: string;
  name: string;
  address: string;
  genre: string | null;
  /** 전국 동일 업종 매출 순위 백분위(%). 낮을수록 상위 */
  rankNational: number | null;
  /** 시·군·구 동일 업종 매출 순위 백분위(%). 낮을수록 상위 */
  rankLocal: number | null;
  isLocalFavorite: boolean;
  /** 최근 1개월 첫/마지막 결제 시각 기반 "예상" 영업시간 (HH:MM) */
  estimatedHours: { start: string; end: string } | null;
  holidays: string[];
  busiest: { day: string | null; time: string | null } | null;
  topCustomers: string[];
  foreignerVisits: boolean;
  groupDining: boolean;
  lat: number | null;
  lng: number | null;
  /** 잇플 상세 페이지 — 원본 그대로 (변형 금지) */
  merUrl: string;
};

export type EatplSearchParams = {
  /** 주소 부분 일치 */
  location?: string;
  /** 업종명 (대분류 또는 소분류) */
  genre?: string;
  /** 가맹점명 부분 일치 */
  merchantName?: string;
};

export const EATPL_ATTRIBUTION = 'eat.pl 잇플 · BC카드 결제 데이터 기반';
