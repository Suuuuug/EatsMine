// 마이페이지 화면이 쓰는 타입. 기획서 §10 ERD(profiles, user_region_visits,
// user_food_collection, reviews, restaurants)의 컬럼 이름을 그대로 따른다.
// 백엔드 API가 생기면 응답을 이 모양으로 맞춘다. DB 스키마는 아직 정해지지 않았다.

export type Visibility = "private" | "public";

/** profiles */
export type Profile = {
  id: string;
  nickname: string;
  avatar_url: string | null;
  created_at: string; // ISO 8601
};

/** user_region_visits + regions(name) */
export type RegionVisit = {
  region_id: number;
  region_name: string;
  first_visited_at: string;
};

/** user_food_collection + foods(name) */
export type FoodCollectionItem = {
  food_id: number;
  food_name: string;
  collected_at: string;
};

/** reviews + restaurants(name, mer_url) */
export type MyReview = {
  id: string;
  restaurant_id: string;
  restaurant_name: string;
  /** 잇플 상세 주소. 예시 데이터에는 넣지 않는다(가짜 merUrl 금지). */
  mer_url: string | null;
  rating: 1 | 2 | 3 | 4 | 5;
  content: string;
  visited_at: string; // YYYY-MM-DD
  visibility: Visibility;
  created_at: string;
};

/**
 * 프로필 단위 공개 범위. ERD에 아직 컬럼이 없다(reviews.visibility, share_links만 있음).
 * 백엔드 설계 때 profiles 컬럼이나 별도 테이블로 정한다. 기본값은 모두 꺼짐(기획서 §8).
 */
export type PrivacySettings = {
  territoryPublic: boolean;
  collectionPublic: boolean;
  newReviewsPublic: boolean;
};

export type MyPageData = {
  /** true면 화면에 예시 데이터라고 밝힌다. */
  isSample: boolean;
  profile: Profile;
  regionVisits: RegionVisit[];
  foodCollection: FoodCollectionItem[];
  reviews: MyReview[];
};

export const DEFAULT_PRIVACY: PrivacySettings = {
  territoryPublic: false,
  collectionPublic: false,
  newReviewsPublic: false,
};
