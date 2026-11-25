import { FOOD_ILLUSTRATIONS } from "../../data/food-illustrations.ts";
import { formatFoodMonths, seasonsForMonths } from "../../data/food-seasons.ts";
import type { SeasonalFoodItem } from "../../types/dictionary.ts";

// --- 백엔드 도감·영토·내 기록 응답 DTO ---

export type ApiFoodListItem = {
  id: number;
  name: string;
  description: string;
  imageUrl: string | null;
  months: number[];
};

export type ApiFoodListResponse = {
  items: ApiFoodListItem[];
};

export type ApiFoodDetailResponse = ApiFoodListItem & {
  sourceUrl: string | null;
  regions: { code: string; fullName: string; reason: string }[];
  genres: string[];
};

export type ApiTerritoryContender = {
  ownerId?: string;
  nickname?: string;
  ownerNickname?: string;
  reviewCount: number;
};

export type ApiTerritoryOwner = {
  regionCode: string;
  ownerId?: string;
  ownerNickname: string;
  reviewCount: number;
  /** 백엔드가 추후 2·3위까지 확장해 내려줄 경우 사용 */
  top?: ApiTerritoryContender[];
};

export type ApiTerritoriesResponse = {
  windowDays: number;
  items: ApiTerritoryOwner[];
};

export type ApiRankingEntry = {
  position: number;
  nickname: string;
  rank: string;
  rankLabel: string;
  avatarUrl: string | null;
  reviewCount: number;
  isMe: boolean;
};

export type ApiRegionRankingResponse = {
  region: { code: string; fullName: string };
  windowDays: number;
  items: ApiRankingEntry[];
  me: ApiRankingEntry | null;
};

export type NormalizedRegionRanking = {
  windowDays: number;
  items: ApiRankingEntry[];
  me: ApiRankingEntry | null;
  standing: { rank: number; toFirst: number } | null;
};

export type MyDictionaryState = {
  userId: string | null;
  collectedFoodIds: number[];
  collectedFoodNames: string[];
  reviewCount: number;
  nickname: string | null;
};

export type ApiMyCollectionItem = {
  foodId: number;
  foodName: string;
  imageUrl: string | null;
  collectedAt: string;
};

export type ApiMyCollectionResponse = {
  count: number;
  total: number;
  items: ApiMyCollectionItem[];
};

export type ApiMyProfileResponse = {
  id: string;
  nickname: string;
  rank: string;
  rankLabel: string;
  avatarUrl: string | null;
  reviewCount?: number;
  createdAt: string;
};

const ILLUSTRATIONS: Readonly<Record<string, string>> = FOOD_ILLUSTRATIONS;

/** API 기본 주소를 정규화한다(끝 슬래시 제거, 비어 있으면 null). */
export function normalizeApiBase(raw: string | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\/+$/, "");
}

/** 안전한 외부 https URL만 허용한다. */
export function validHttpsUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" ? value : null;
  } catch {
    return null;
  }
}

function validMonths(months: unknown): number[] {
  if (!Array.isArray(months)) return [];
  return months.filter(
    (m): m is number => typeof m === "number" && Number.isInteger(m) && m >= 1 && m <= 12,
  );
}

/**
 * GET /foods 응답을 프론트 스냅샷(SEASONAL_FOODS)과 병합한다.
 * - 기존 43종 SVG 일러스트·URL 슬러그(id)와 스냅샷 산지·검색 키워드를 유지하면서
 *   백엔드 DB의 숫자 ID(apiId), 최신 설명, 제철 월(months)을 정본으로 반영한다.
 */
export function mergeFoodsWithApi(
  fallbackFoods: readonly SeasonalFoodItem[],
  apiItems: readonly ApiFoodListItem[],
): SeasonalFoodItem[] {
  const byName = new Map(fallbackFoods.map((item) => [item.name, item]));
  const result: SeasonalFoodItem[] = [];

  for (const item of apiItems) {
    if (!Number.isInteger(item.id) || item.id < 1 || !item.name?.trim()) continue;
    const matched = byName.get(item.name);
    const slug = matched?.id ?? ILLUSTRATIONS[item.name] ?? `food-${item.id}`;
    const months = validMonths(item.months);
    const safeMonths = months.length > 0 ? months : (matched?.months ?? []);
    const src =
      validHttpsUrl(item.imageUrl) ??
      matched?.src ??
      (ILLUSTRATIONS[item.name] ? `/images/foods/${ILLUSTRATIONS[item.name]}.svg` : "/icon.svg");

    result.push({
      id: slug,
      apiId: item.id,
      name: item.name,
      description: item.description || matched?.description || "",
      src,
      months: safeMonths,
      seasons: seasonsForMonths(safeMonths),
      seasonLabel: formatFoodMonths(safeMonths),
      regions: matched?.regions ?? [],
      keywords: matched?.keywords ?? [item.name],
      genres: matched?.genres,
      sourceUrl: matched?.sourceUrl,
    });
  }

  return result.length > 0 ? result : [...fallbackFoods];
}

/**
 * GET /foods/:id 상세 응답을 기존 음식 항목에 병합한다.
 * DB 최신 산지(regions)·업종(genres)·설명·제철 월을 반영한다.
 */
export function mergeFoodDetailWithApi(
  food: SeasonalFoodItem,
  detail: ApiFoodDetailResponse,
): SeasonalFoodItem {
  const months = validMonths(detail.months);
  const safeMonths = months.length > 0 ? months : food.months;
  const regions = Array.isArray(detail.regions)
    ? detail.regions
        .filter((r) => /^\d{5}$/.test(r.code) && Boolean(r.fullName))
        .map((r) => ({
          code: r.code,
          name: r.fullName,
          reason: r.reason ?? "",
        }))
    : food.regions;

  return {
    ...food,
    apiId: detail.id,
    name: detail.name || food.name,
    description: detail.description || food.description,
    src: validHttpsUrl(detail.imageUrl) ?? food.src,
    months: safeMonths,
    seasons: seasonsForMonths(safeMonths),
    seasonLabel: formatFoodMonths(safeMonths),
    regions,
    genres: Array.isArray(detail.genres)
      ? detail.genres.filter((g): g is string => typeof g === "string" && g.length > 0)
      : food.genres,
    sourceUrl: validHttpsUrl(detail.sourceUrl),
  };
}

function normalizeContender(
  c: ApiTerritoryContender,
  fallbackId: string,
): { ownerId: string; nickname: string; reviewCount: number } | null {
  const nickname = (c.nickname ?? c.ownerNickname ?? "").trim();
  if (!nickname || typeof c.reviewCount !== "number" || c.reviewCount <= 0) {
    return null;
  }
  return {
    ownerId: c.ownerId?.trim() || fallbackId,
    nickname,
    reviewCount: c.reviewCount,
  };
}

/**
 * GET /territories 응답을 regionCode → 영토 주인(+선택적 2·3위) 맵으로 변환한다.
 * - 현재 백엔드(지역당 1명)와 향후 3위 확장(`top` 배열 또는 같은 regionCode 다중 행)을 모두 호환한다.
 */
export function toTerritoryOwnerMap(
  response: ApiTerritoriesResponse,
): { windowDays: number; ownersByRegion: Record<string, ApiTerritoryOwner> } {
  const windowDays =
    typeof response.windowDays === "number" && response.windowDays > 0
      ? response.windowDays
      : 30;
  const ownersByRegion: Record<string, ApiTerritoryOwner> = {};
  if (!Array.isArray(response.items)) {
    return { windowDays, ownersByRegion };
  }

  for (const item of response.items) {
    if (
      !item ||
      !/^\d{5}$/.test(item.regionCode) ||
      typeof item.ownerNickname !== "string" ||
      !item.ownerNickname.trim() ||
      typeof item.reviewCount !== "number" ||
      item.reviewCount <= 0
    ) {
      continue;
    }

    const existing = ownersByRegion[item.regionCode];
    if (!existing) {
      const top = Array.isArray(item.top)
        ? item.top
            .map((c, idx) =>
              normalizeContender(c, `${item.regionCode}-rank-${idx + 2}`),
            )
            .filter(
              (c): c is { ownerId: string; nickname: string; reviewCount: number } =>
                c !== null,
            )
            .slice(0, 2)
        : undefined;

      ownersByRegion[item.regionCode] = {
        regionCode: item.regionCode,
        ...(item.ownerId ? { ownerId: item.ownerId } : {}),
        ownerNickname: item.ownerNickname.trim(),
        reviewCount: item.reviewCount,
        ...(top && top.length > 0 ? { top } : {}),
      };
    } else {
      // 같은 regionCode로 2·3위 행이 여러 개 내려오는 백엔드 확장 형태도 자동 병합(최대 Top 3)
      const combined = [
        {
          ownerId: existing.ownerId || `${item.regionCode}-rank-1`,
          nickname: existing.ownerNickname,
          reviewCount: existing.reviewCount,
        },
        ...(existing.top ?? []).map((c, idx) => ({
          ownerId: c.ownerId || `${item.regionCode}-rank-${idx + 2}`,
          nickname: (c.nickname ?? c.ownerNickname ?? "").trim(),
          reviewCount: c.reviewCount,
        })),
        {
          ownerId:
            item.ownerId ||
            `${item.regionCode}-rank-${(existing.top?.length ?? 0) + 2}`,
          nickname: item.ownerNickname.trim(),
          reviewCount: item.reviewCount,
        },
      ]
        .filter((c) => Boolean(c.nickname))
        .sort((a, b) => b.reviewCount - a.reviewCount)
        .slice(0, 3);

      const [first, ...rest] = combined;
      if (first) {
        ownersByRegion[item.regionCode] = {
          regionCode: item.regionCode,
          ownerId: first.ownerId,
          ownerNickname: first.nickname,
          reviewCount: first.reviewCount,
          ...(rest.length > 0 ? { top: rest } : {}),
        };
      }
    }
  }
  return { windowDays, ownersByRegion };
}

/** GET /me/collection 결과를 프론트 음식 슬러그(id) Set으로 매핑한다. */
export function resolveCollectedSlugs(
  foods: readonly SeasonalFoodItem[],
  collectedFoodIds: readonly number[],
  collectedFoodNames: readonly string[] = [],
): Set<string> {
  const idSet = new Set(collectedFoodIds);
  const nameSet = new Set(collectedFoodNames);
  const slugs = new Set<string>();

  for (const food of foods) {
    if ((food.apiId !== undefined && idSet.has(food.apiId)) || nameSet.has(food.name)) {
      slugs.add(food.id);
    }
  }
  return slugs;
}

// --- 실제 백엔드 HTTP 요청 함수 ---

export async function fetchFoods(
  apiBase: string,
  signal?: AbortSignal,
): Promise<ApiFoodListItem[]> {
  const response = await fetch(`${apiBase}/foods`, {
    signal,
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`GET /foods failed (${response.status})`);
  }
  const data = (await response.json()) as Partial<ApiFoodListResponse>;
  if (!Array.isArray(data.items)) {
    throw new Error("GET /foods invalid payload");
  }
  return data.items;
}

export async function fetchFoodDetail(
  apiBase: string,
  foodId: number,
  signal?: AbortSignal,
): Promise<ApiFoodDetailResponse> {
  const response = await fetch(`${apiBase}/foods/${foodId}`, {
    signal,
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`GET /foods/${foodId} failed (${response.status})`);
  }
  return (await response.json()) as ApiFoodDetailResponse;
}

export async function fetchTerritories(
  apiBase: string,
  signal?: AbortSignal,
): Promise<{ windowDays: number; ownersByRegion: Record<string, ApiTerritoryOwner> }> {
  const response = await fetch(`${apiBase}/territories`, {
    signal,
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`GET /territories failed (${response.status})`);
  }
  const data = (await response.json()) as ApiTerritoriesResponse;
  return toTerritoryOwnerMap(data);
}

/**
 * GET /territories/:regionCode/ranking 응답을 도감 "이 지역 순위" 표시용으로 정규화한다.
 * - 상위 topLimit명(기본 3명)만 추리고, 로그인 사용자가 3위 밖이어도 내 순위(me)와 1위까지 남은 리뷰 수를 계산한다.
 */
export function normalizeRegionRanking(
  response: ApiRegionRankingResponse,
  topLimit = 3,
): NormalizedRegionRanking {
  const windowDays =
    typeof response.windowDays === "number" && response.windowDays > 0
      ? response.windowDays
      : 30;
  const safeLimit = Math.max(1, Math.floor(topLimit));

  const normalizeEntry = (entry: ApiRankingEntry | null | undefined): ApiRankingEntry | null => {
    if (
      !entry ||
      typeof entry.position !== "number" ||
      !Number.isInteger(entry.position) ||
      entry.position < 1 ||
      typeof entry.nickname !== "string" ||
      !entry.nickname.trim() ||
      typeof entry.reviewCount !== "number" ||
      entry.reviewCount <= 0
    ) {
      return null;
    }
    return {
      position: entry.position,
      nickname: entry.nickname.trim(),
      rank: typeof entry.rank === "string" ? entry.rank : "rookie",
      rankLabel: typeof entry.rankLabel === "string" ? entry.rankLabel : "",
      avatarUrl: validHttpsUrl(entry.avatarUrl),
      reviewCount: entry.reviewCount,
      isMe: Boolean(entry.isMe),
    };
  };

  const validItems = Array.isArray(response.items)
    ? response.items
        .map((item) => normalizeEntry(item))
        .filter((item): item is ApiRankingEntry => item !== null)
        .sort((a, b) => a.position - b.position)
    : [];

  const items = validItems.slice(0, safeLimit);
  const me =
    normalizeEntry(response.me) ??
    validItems.find((item) => item.isMe) ??
    null;

  let standing: { rank: number; toFirst: number } | null = null;
  if (me && validItems.length > 0) {
    if (me.position === 1) {
      standing = { rank: 1, toFirst: 0 };
    } else {
      standing = {
        rank: me.position,
        toFirst: Math.max(1, validItems[0].reviewCount - me.reviewCount + 1),
      };
    }
  }

  return { windowDays, items, me, standing };
}

export async function fetchRegionRanking(
  apiBase: string,
  regionCode: string,
  accessToken: string | null = null,
  signal?: AbortSignal,
): Promise<NormalizedRegionRanking> {
  const headers: Record<string, string> = {};
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  const response = await fetch(
    `${apiBase}/territories/${encodeURIComponent(regionCode)}/ranking`,
    {
      headers,
      signal,
      cache: "no-store",
    },
  );
  if (!response.ok) {
    throw new Error(`GET /territories/${regionCode}/ranking failed (${response.status})`);
  }
  const data = (await response.json()) as ApiRegionRankingResponse;
  return normalizeRegionRanking(data, 3);
}

/**
 * 로그인된 사용자의 내 도감 수집 현황·총 리뷰 수·프로필을 병렬 조회한다.
 * GET /me 응답의 reviewCount를 사용해 /me/reviews 추가 호출 없이 한 번에 동기화한다.
 * 토큰 만료(401) 시 null을 반환해 비로그인 상태로 안전하게 폴백한다.
 */
export async function fetchMyDictionaryState(
  apiBase: string,
  accessToken: string,
  signal?: AbortSignal,
): Promise<MyDictionaryState | null> {
  const headers = { Authorization: `Bearer ${accessToken}` };
  const [profileRes, collectionRes] = await Promise.all([
    fetch(`${apiBase}/me`, { headers, signal, cache: "no-store" }),
    fetch(`${apiBase}/me/collection`, { headers, signal, cache: "no-store" }),
  ]);

  if (profileRes.status === 401 || collectionRes.status === 401) {
    return null;
  }
  if (!profileRes.ok || !collectionRes.ok) {
    throw new Error("내 도감 정보를 불러오지 못했어요.");
  }

  const [profile, collection] = (await Promise.all([
    profileRes.json(),
    collectionRes.json(),
  ])) as [ApiMyProfileResponse, ApiMyCollectionResponse];

  return {
    userId: profile.id ?? null,
    collectedFoodIds: Array.isArray(collection.items)
      ? collection.items.map((item) => item.foodId)
      : [],
    collectedFoodNames: Array.isArray(collection.items)
      ? collection.items.map((item) => item.foodName)
      : [],
    reviewCount:
      typeof profile.reviewCount === "number" && Number.isFinite(profile.reviewCount)
        ? Math.max(0, profile.reviewCount)
        : 0,
    nickname: profile.nickname ?? null,
  };
}

const OUTBOUND_SESSION_KEY = "eatsmine_outbound_session";

function getOrCreateSessionKey(): string {
  if (typeof window === "undefined") return "server-session";
  try {
    const stored = window.sessionStorage.getItem(OUTBOUND_SESSION_KEY);
    if (stored && /^[A-Za-z0-9_-]{8,64}$/.test(stored)) return stored;
    const generated = `em_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    window.sessionStorage.setItem(OUTBOUND_SESSION_KEY, generated);
    return generated;
  } catch {
    return `em_${Date.now().toString(36)}_anon`;
  }
}

/**
 * POST /events/outbound — 가게 자세히 보기(잇플 이동) 클릭을 비차단으로 기록한다.
 * 기록 성공 여부와 상관없이 외부 링크 이동을 절대 막지 않는다.
 */
export function recordOutboundEvent(
  apiBase: string | null,
  params: {
    restaurantKey: string;
    regionCode?: string;
    placement: "list" | "map" | "share";
  },
): void {
  if (!apiBase || typeof window === "undefined") return;
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(params.restaurantKey)) return;

  const payload = JSON.stringify({
    restaurantKey: params.restaurantKey,
    ...(params.regionCode && /^\d{5}$/.test(params.regionCode)
      ? { regionCode: params.regionCode }
      : {}),
    placement: params.placement,
    sessionKey: getOrCreateSessionKey(),
  });

  const url = `${apiBase}/events/outbound`;
  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      navigator.sendBeacon(url, new Blob([payload], { type: "text/plain" }));
      return;
    }
    void fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // 클릭 기록 실패는 무시하고 링크 이동 유지
  }
}

/** 목록을 pageSize 단위로 나누고 좁은 컬럼에 맞는 최대 5개 페이지 번호 창을 계산한다. */
export function paginateItems<T>(
  items: readonly T[],
  requestedPage: number,
  pageSize: number,
): {
  items: T[];
  page: number;
  totalPages: number;
  pageNumbers: number[];
} {
  const safeSize = Math.max(1, Math.floor(pageSize));
  const totalPages = Math.max(1, Math.ceil(items.length / safeSize));
  const page = Math.min(Math.max(1, Math.floor(requestedPage)), totalPages);
  const start = (page - 1) * safeSize;
  const sliced = items.slice(start, start + safeSize);

  const windowSize = 5;
  let winStart = Math.max(1, page - Math.floor(windowSize / 2));
  const winEnd = Math.min(totalPages, winStart + windowSize - 1);
  winStart = Math.max(1, winEnd - windowSize + 1);

  const pageNumbers: number[] = [];
  for (let p = winStart; p <= winEnd; p += 1) {
    pageNumbers.push(p);
  }

  return {
    items: sliced,
    page,
    totalPages,
    pageNumbers,
  };
}
