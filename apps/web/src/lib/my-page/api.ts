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
  const myReviews: MyReview[] = reviews.map((r) => ({
    id: String(r.id),
    restaurant_id: r.restaurant.id,
    restaurant_name: r.restaurant.name,
    mer_url: r.restaurant.merUrl,
    rating: clampRating(r.rating),
    content: r.content ?? "",
    visited_at: r.visitedAt ?? r.createdAt.slice(0, 10),
    visibility: r.visibility,
    created_at: r.createdAt,
  }));
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

export type ShareType = "territory" | "collection";
export const createShare = (token: string, type: ShareType) => apiFetch<{ id: string }>("/me/shares", token, { method: "POST", body: JSON.stringify({ type }) });
export const removeShare = (token: string, type: ShareType) => apiFetch<void>(`/me/shares/${type}`, token, { method: "DELETE" });
