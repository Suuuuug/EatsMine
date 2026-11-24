/** 인기 지역 개수 (D5) */
export const POPULAR_REGION_COUNT = 6;

/**
 * 콜드 스타트용 기본 인기 지역 (D5). 리뷰가 있는 지역이 부족할 때 이 순서로 채운다.
 * 서울 중구, 부산 해운대구, 전주시, 강릉시, 여수시, 제주시
 */
export const DEFAULT_POPULAR_REGION_CODES = [
  '11140',
  '26350',
  '52110',
  '51150',
  '12130',
  '50110',
] as const;
