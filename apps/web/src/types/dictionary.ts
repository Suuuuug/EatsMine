import type { Season } from "@/lib/assets/catalog";

// 제철음식 도감 도메인 타입 (추후 백엔드 GET /api/foods 및 /api/me/collection 연동 기준)

export type SeasonKey = "all" | Season;

export interface SeasonalFoodItem {
  id: string;
  /** 백엔드 GET /foods 의 숫자 음식 ID (연결 후 상세·식당·수집 조회에 사용) */
  apiId?: number;
  /** 지역명을 제외한 음식명 */
  name: string;
  seasons: Season[];
  months: number[];
  description: string;
  /** 공식 음식 SVG 경로 (/images/foods/*.svg) 또는 백엔드 이미지 URL */
  src: string;
  /** 제철 시기 표기 (예: "11월, 12월, 1월, 2월") */
  seasonLabel: string;
  /** 주요 추천 여행 지역 (시·군·구 이름) */
  regions: { code: string; name: string; reason: string }[];
  /** 검색 보조 키워드 */
  keywords: string[];
  /** 백엔드 GET /foods/:id 의 관련 업종 목록 */
  genres?: string[];
  /** 백엔드 GET /foods/:id 의 참고 출처 URL */
  sourceUrl?: string | null;
}
