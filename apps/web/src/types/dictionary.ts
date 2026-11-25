import type { Season } from "@/lib/assets/catalog";

// 제철음식 도감 도메인 타입 (추후 백엔드 GET /api/foods 및 /api/me/collection 연동 기준)

export type SeasonKey = "all" | Season;

export interface SeasonalFoodItem {
  id: string;
  /** 지역명을 제외한 음식명 */
  name: string;
  seasons: Season[];
  months: number[];
  description: string;
  /** 공식 음식 SVG 경로 (/images/foods/*.svg) */
  src: string;
  /** 제철 시기 표기 (예: "11월, 12월, 1월, 2월") */
  seasonLabel: string;
  /** 주요 추천 여행 지역 (시·군·구 이름) */
  regions: { code: string; name: string; reason: string }[];
  /** 검색 보조 키워드 */
  keywords: string[];
}
