import type { FoodCollectionItem, MyPageData, MyReview, Profile, RegionVisit } from "@/types/my-page";

// 우리 API(/me*)의 응답을 마이페이지 화면 모양(MyPageData)으로 바꾼다. 변환은 순수 함수라 따로 테스트한다.
// 잇플 merUrl은 응답값 그대로 둔다.

export type ProfileDto = { id: string; nickname: string; avatarUrl: string | null; createdAt: string };
export type ReviewDto = {
  id: number;
  restaurant: { id: string; name: string; merUrl: string };
  rating: number;
  content: string | null;
  visitedAt: string | null;
  visibility: "private" | "public";
  createdAt: string;
};
export type TerritoriesDto = { items: { regionCode: string; regionName: string; firstVisitedAt: string }[] };
export type CollectionDto = { items: { foodId: number; foodName: string; collectedAt: string }[] };

const apiBase = process.env.NEXT_PUBLIC_API_URL;

export class ApiError extends Error {
  status: number;
  constructor(status: number) {
    super(`API ${status}`);
    this.status = status;
  }
}

export async function apiFetch<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  if (!apiBase) throw new ApiError(0);
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    cache: "no-store",
    headers: { ...init?.headers, authorization: `Bearer ${token}`, ...(init?.body ? { "content-type": "application/json" } : {}) },
  });
  if (!response.ok) throw new ApiError(response.status);
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

const clampRating = (n: number): MyReview["rating"] => Math.min(5, Math.max(1, Math.round(n))) as MyReview["rating"];

/** API 리뷰 → 화면 리뷰. 잇플 merUrl은 응답값 그대로 둔다. */
export function toMyReview(r: ReviewDto): MyReview {
  return {
    id: String(r.id),
    restaurant_id: r.restaurant.id,
    restaurant_name: r.restaurant.name,
    mer_url: r.restaurant.merUrl,
    rating: clampRating(r.rating),
    content: r.content ?? "",
    visited_at: r.visitedAt ?? r.createdAt.slice(0, 10),
    visibility: r.visibility,
    created_at: r.createdAt,
  };
}

export function toMyPageData(
  profile: ProfileDto,
  reviews: ReviewDto[],
  territories: TerritoriesDto,
  collection: CollectionDto,
): MyPageData {
  const p: Profile = { id: profile.id, nickname: profile.nickname, avatar_url: profile.avatarUrl, created_at: profile.createdAt };
  const regionVisits: RegionVisit[] = territories.items.map((t) => ({
    region_id: Number(t.regionCode),
    region_name: t.regionName,
    first_visited_at: t.firstVisitedAt,
  }));
  const foodCollection: FoodCollectionItem[] = collection.items.map((c) => ({
    food_id: c.foodId,
    food_name: c.foodName,
    collected_at: c.collectedAt,
  }));
  const myReviews: MyReview[] = reviews.map(toMyReview);
  return { isSample: false, profile: p, regionVisits, foodCollection, reviews: myReviews };
}

export async function fetchMyPage(token: string): Promise<MyPageData> {
  const [profile, reviews, territories, collection] = await Promise.all([
    apiFetch<ProfileDto>("/me", token),
    apiFetch<{ items: ReviewDto[] }>("/me/reviews", token),
    apiFetch<TerritoriesDto>("/me/territories", token),
    apiFetch<CollectionDto>("/me/collection", token),
  ]);
  return toMyPageData(profile, reviews.items, territories, collection);
}

export type PublicReviewDto = {
  id: number;
  author: { nickname: string; rank: string; rankLabel: string; avatarUrl: string | null };
  rating: number;
  content: string | null;
  visitedAt: string | null;
  createdAt: string;
};
export type RestaurantReviewsDto = { restaurantId: string; summary: { average: number; count: number } | null; items: PublicReviewDto[] };

/** 매장 공개 리뷰(로그인 불필요). 매장 ID는 merUrl 끝 고유값이다. */
export async function fetchRestaurantReviews(restaurantId: string): Promise<RestaurantReviewsDto> {
  if (!apiBase) throw new ApiError(0);
  const response = await fetch(`${apiBase}/restaurants/${encodeURIComponent(restaurantId)}/reviews`, { cache: "no-store" });
  if (!response.ok) throw new ApiError(response.status);
  return (await response.json()) as RestaurantReviewsDto;
}

export type CreateReviewInput = { merUrl: string; restaurantName: string; rating: number; content?: string; visibility: "private" | "public"; foodId?: number };
/** 리뷰 저장. merUrl은 잇플 응답값 그대로 보낸다. 사진은 API에 아직 없어 보내지 않는다. */
export const createReview = (token: string, input: CreateReviewInput) =>
  apiFetch<{ id: number }>("/reviews", token, { method: "POST", body: JSON.stringify(input) });

export type ReviewPatch = { rating?: number; content?: string; visibility?: "private" | "public" };
/** 내 리뷰 수정. 빈 내용은 리뷰 글 없음으로 저장된다. */
export const updateReview = (token: string, id: string, patch: ReviewPatch) =>
  apiFetch<ReviewDto>(`/reviews/${encodeURIComponent(id)}`, token, { method: "PATCH", body: JSON.stringify(patch) });
/** 내 리뷰 삭제. 이 리뷰로 받은 영토·도감 기록도 서버가 함께 되돌린다. */
export const deleteReview = (token: string, id: string) =>
  apiFetch<void>(`/reviews/${encodeURIComponent(id)}`, token, { method: "DELETE" });

export type FoodCandidate = { id: number; name: string };
/** 리뷰에 고를 음식 후보(로그인 불필요): 매장 업종에 연결된 도감 음식. 고른 음식은 도감에 모인다. */
export async function fetchFoodCandidates(genre: string): Promise<FoodCandidate[]> {
  if (!apiBase) throw new ApiError(0);
  const response = await fetch(`${apiBase}/foods?${new URLSearchParams({ genre })}`);
  if (!response.ok) throw new ApiError(response.status);
  const data = (await response.json()) as { items?: { id: number; name: string }[] };
  return Array.isArray(data.items) ? data.items.map(({ id, name }) => ({ id, name })) : [];
}

/** 리뷰 저장 실패 문구. 409는 같은 매장에 이미 리뷰를 쓴 경우다(1인 1리뷰, 수정은 마이페이지). */
export function createReviewErrorMessage(status: number): string {
  if (status === 409) return "이미 리뷰를 남긴 매장이에요. 마이페이지에서 고칠 수 있어요.";
  if (status === 401) return "로그인이 만료됐어요. 다시 로그인해 주세요.";
  if (status === 429) return "요청이 많아요. 잠시 후 다시 시도해 주세요.";
  if (status === 400) return "입력한 내용을 확인해 주세요.";
  return "리뷰를 저장하지 못했어요. 다시 시도해 주세요.";
}

