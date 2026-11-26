import type { FoodCollectionItem, MyPageData, MyReview, Profile, RegionVisit } from "@/types/my-page";

// 우리 API(/me*)의 응답을 마이페이지 화면 모양(MyPageData)으로 바꾼다. 변환은 순수 함수라 따로 테스트한다.
// 잇플 merUrl은 응답값 그대로 둔다.

export type ProfileDto = { id: string; nickname: string; avatarUrl: string | null; createdAt: string; rankLabel?: string; reviewCount?: number };
export type ReviewDto = {
  id: number;
  restaurant: { id: string; name: string; merUrl: string; regionCode?: string | null };
  food?: { id: number; name: string } | null;
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

/**
 * 사진 파일을 저장소(Supabase Storage)에 올리는 단계의 실패. status는 저장소 응답 코드(413 용량 초과 등).
 * 우리 API의 401(로그인 만료)과 섞이지 않게 따로 구분한다.
 */
export class PhotoUploadError extends ApiError {
  constructor(status: number) {
    super(status);
    this.name = "PhotoUploadError";
  }
}

/** 사진 올리기 실패 안내. 우리 API의 401은 로그인 만료, 저장소 413은 용량 초과, 나머지는 다시 시도 */
export function photoUploadErrorMessage(e: unknown): string {
  if (e instanceof PhotoUploadError && e.status === 413) return "사진이 너무 커요. 다른 사진을 골라 주세요.";
  if (!(e instanceof PhotoUploadError) && e instanceof ApiError && e.status === 401) return "로그인이 만료됐어요. 다시 로그인해 주세요.";
  return "사진을 올리지 못했어요. 다시 시도해 주세요.";
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
    region_code: r.restaurant.regionCode ?? null,
    food_name: r.food?.name ?? null,
  };
}

export function toMyPageData(
  profile: ProfileDto,
  reviews: ReviewDto[],
  territories: TerritoriesDto,
  collection: CollectionDto,
): MyPageData {
  const p: Profile = { id: profile.id, nickname: profile.nickname, avatar_url: profile.avatarUrl, created_at: profile.createdAt, rank_label: profile.rankLabel, review_count: profile.reviewCount };
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
  /** 1시간 유효한 서명 URL. 저장하지 말고 볼 때마다 응답 값을 쓴다 */
  photos?: { url: string }[];
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

export type CreateReviewInput = {
  merUrl: string;
  restaurantName: string;
  rating: number;
  content?: string;
  visibility: "private" | "public";
  foodId?: number;
  /** uploadReviewPhoto로 받은 경로(최대 4장, 순서대로) */
  photoPaths?: string[];
};
/** 리뷰 저장. merUrl은 잇플 응답값 그대로 보낸다. */
export const createReview = (token: string, input: CreateReviewInput) =>
  apiFetch<{ id: number }>("/reviews", token, { method: "POST", body: JSON.stringify(input) });

export type ReviewPatch = { rating?: number; content?: string; visitedAt?: string; visibility?: "private" | "public" };
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

/** 리뷰 사진으로 올릴 수 있는 형식·크기(api·버킷 설정과 같다) */
export const REVIEW_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_REVIEW_PHOTO_BYTES = 5 * 1024 * 1024;
/** 고를 수 있는 원본 크기. 올리기 전에 줄여서 다시 저장하므로 5MB보다 큰 원본도 받는다 */
export const MAX_REVIEW_PHOTO_INPUT_BYTES = 20 * 1024 * 1024;

/** 고른 사진을 받을 수 없으면 안내 문구, 괜찮으면 null(올리기 전에 위치 정보를 지우고 줄여서 다시 저장한다) */
export function reviewPhotoProblem(file: { type: string; size: number }): string | null {
  if (!(REVIEW_PHOTO_TYPES as readonly string[]).includes(file.type)) return "JPG, PNG, WEBP 사진만 올릴 수 있어요.";
  if (file.size > MAX_REVIEW_PHOTO_INPUT_BYTES) return "사진은 한 장에 20MB까지 고를 수 있어요.";
  return null;
}

/**
 * 리뷰 사진 1장 올리기: api에서 서명 업로드 URL을 받고, 그 URL로 파일을 바로 PUT한다(파일은 api를 거치지 않음).
 * 돌려준 경로를 리뷰 작성의 photoPaths에 넣는다. 실패하면 ApiError(상태 코드, 업로드 단계 실패는 0).
 */
export async function uploadReviewPhoto(token: string, file: File): Promise<string> {
  const { path, uploadUrl } = await apiFetch<{ path: string; uploadUrl: string }>("/reviews/photos/uploads", token, {
    method: "POST",
    body: JSON.stringify({ contentType: file.type, size: file.size }),
  });
  const put = await fetch(uploadUrl, { method: "PUT", headers: { "content-type": file.type }, body: file });
  if (!put.ok) throw new PhotoUploadError(put.status);
  return path;
}

