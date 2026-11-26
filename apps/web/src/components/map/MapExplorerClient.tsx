"use client";

import { useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActionButton,
  EmptyState,
  FilterChip,
  SkeletonRow,
  useToast,
} from "@/components/em";
import { Icon } from "@/components/icon/Icon";
import {
  InteractiveTileMap,
  type MapMode,
} from "@/components/map/InteractiveTileMap";
import { RestaurantReviewSheet } from "@/components/map/RestaurantReviewSheet";
import { sortRegions, validEatplUrl } from "@/lib/map/home-contract";
import {
  MAX_GENRES,
  PLACE_PAGE_SIZE,
  cardPhotoUrl,
  isPreviewMode,
  pagePlaces,
  toCardReview,
} from "@/lib/map/map-data";
import { genreIllustration } from "@/lib/map/genre-illustration";
import { rememberSourceChannel, trackOutbound } from "@/lib/map/outbound";
import {
  useMapRestaurants,
  useTerritoryOwners,
} from "@/lib/map/use-map-data";
import {
  SITE_NAME,
  formatTravelFullName,
  getRegionSearchText,
  getTravelProvinceName,
  sortProvincesByTravelName,
} from "@/lib/seo/site";
import {
  DEFAULT_REGION,
  FOOD_SLUG_PRESETS,
  MOCK_GENRES,
  MOCK_TERRITORY_OWNERS,
  QUICK_GENRES,
  buildMockSearchResult,
  getSamplePlaceReviews,
  type PlaceReviewItem,
} from "@/data/map-mock";
import { placeNote, type PlaceResult } from "@/lib/map/place-search";
import type { EatplPlace, RegionItem, TerritoryOwner } from "@/types/map";
import { MapSearchBox } from "./MapSearchBox";

type RawRegionMeta = {
  provinces: { code: string; name: string }[];
  territories: {
    code: string;
    name: string;
    parentCode?: string;
    labelPoint?: [number, number];
  }[];
};

type ActiveFoodSelection = {
  slug: string;
  name: string;
};

function findNearestRegion(
  lat: number,
  lng: number,
  regions: readonly RegionItem[],
): RegionItem | null {
  // 한국 범위 밖(해외/VPN 등)이면 폴백 유지
  if (lat < 32.5 || lat > 39.2 || lng < 124.0 || lng > 132.2) return null;
  let best: RegionItem | null = null;
  let bestDistSq = Infinity;
  const cosLat = Math.cos((lat * Math.PI) / 180);

  for (const r of regions) {
    if (r.centerLat == null || r.centerLng == null) continue;
    const dLat = r.centerLat - lat;
    const dLng = (r.centerLng - lng) * cosLat;
    const distSq = dLat * dLat + dLng * dLng;
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      best = r;
    }
  }
  return best;
}

function resolveInitialState(
  foodParam: string | null,
  regionParam: string | null,
  regionByCode: ReadonlyMap<string, RegionItem>,
): {
  region: RegionItem | null;
  genres: string[];
  food: ActiveFoodSelection | null;
} {
  if (foodParam) {
    const preset = FOOD_SLUG_PRESETS[foodParam];
    if (preset) {
      const targetCode = regionParam ?? preset.regionCode;
      const resolvedRegion = regionByCode.get(targetCode) ?? {
        code: preset.regionCode,
        name: preset.regionFullName.split(" ").at(-1) ?? preset.regionFullName,
        fullName: preset.regionFullName,
        centerLat: preset.centerLat,
        centerLng: preset.centerLng,
      };
      return {
        region: resolvedRegion,
        genres: [preset.genre],
        food: { slug: foodParam, name: preset.label },
      };
    }
  }

  if (regionParam) {
    const found = regionByCode.get(regionParam);
    if (found) {
      return { region: found, genres: [], food: null };
    }
  }

  return { region: DEFAULT_REGION, genres: [], food: null };
}

function syncBrowserUrl(nextPath: string, nextTitle?: string) {
  if (typeof window === "undefined") return;
  const current = `${window.location.pathname}${window.location.search}`;
  if (current !== nextPath) {
    window.history.replaceState(null, "", nextPath);
  }
  if (nextTitle) {
    document.title = nextTitle;
  }
}

type MapExplorerClientProps = {
  /** /travel/[provinceSlug] 진입 시 처음 열어 둘 시·도 코드 (예: "51" 강원도) */
  initialProvinceCode?: string | null;
  /** /travel/[destinationSlug] 진입 시 처음 선택해 둘 여행지 정보 */
  initialRegion?: RegionItem | null;
};

export function MapExplorerClient({
  initialProvinceCode = null,
  initialRegion = null,
}: MapExplorerClientProps = {}) {
  const searchParams = useSearchParams();
  const { show: showToast, toast } = useToast();

  // 예시 모드(API 주소 미설정 또는 /?preview=1). 지역 선택 시 URL에서 preview가 빠져도 유지되도록 진입 시 한 번만 정한다.
  const [isPreview] = useState(() =>
    isPreviewMode(process.env.NEXT_PUBLIC_API_URL, searchParams.toString()),
  );
  const apiBase = isPreview ? null : (process.env.NEXT_PUBLIC_API_URL ?? null);
  const [searchAttempt, setSearchAttempt] = useState(0);

  // 잇플 이동 기록용: 지역을 고르면 주소가 바뀌어 utm이 사라지므로 첫 진입 때 유입 채널을 남겨 둔다.
  useEffect(() => {
    rememberSourceChannel();
  }, []);

  // 프론트 내장 전국 16개 시·도 + 230개 시·군·구 목록 (직관적 목록 탐색 + 0ms 자동완성 검색용)
  const [allProvinces, setAllProvinces] = useState<
    { code: string; name: string }[]
  >([]);
  const [allRegions, setAllRegions] = useState<RegionItem[]>(() =>
    initialRegion ? [initialRegion] : [DEFAULT_REGION],
  );
  const [parentCodeByRegion, setParentCodeByRegion] = useState<
    ReadonlyMap<string, string>
  >(() => {
    const seed = initialRegion ?? DEFAULT_REGION;
    return new Map([[seed.code, seed.code.slice(0, 2)]]);
  });

  // 지도 모드('restaurants': 식당 보기 / 'territory': 영토 표시)
  const [mapMode, setMapMode] = useState<MapMode>("restaurants");
  const foodParam = searchParams.get("food")?.trim() || null;
  const regionParam = searchParams.get("region")?.trim() || null;

  /** 지역 미선택 상태에서 왼쪽 목록으로 둘러보고 있는 시·도 코드 (null이면 전국 16개 시·도 목록) */
  const [browsingProvinceCode, setBrowsingProvinceCode] = useState<
    string | null
  >(() =>
    !foodParam && !regionParam && !initialRegion
      ? (initialProvinceCode ?? null)
      : null,
  );
  const [focusProvinceTrigger, setFocusProvinceTrigger] = useState(0);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [locating, setLocating] = useState(false);
  const geoInitializedRef = useRef(false);

  // 업종 필터 패널 열림 여부 (기본 숨김 — '필터' 버튼 클릭 시 열림)
  const [filterOpen, setFilterOpen] = useState(false);
  const [showAllGenres, setShowAllGenres] = useState(false);

  // 지역 검색 자동완성 상태
  const [regionQuery, setRegionQuery] = useState("");
  // 장소(역·랜드마크)로 찾아 들어왔을 때 결과 위에 보이는 한 문장
  const [placeNoteState, setPlaceNoteState] = useState<{ regionCode: string; text: string } | null>(null);

  // 현재 활성 탐색 조건 (백엔드 API 연동 전 프론트 단독 상태)
  const [selectedRegion, setSelectedRegion] = useState<RegionItem | null>(() => {
    if (!foodParam && !regionParam) {
      if (initialRegion) return initialRegion;
      if (initialProvinceCode) return null;
    }
    return resolveInitialState(foodParam, regionParam, new Map()).region;
  });
  const [selectedGenres, setSelectedGenres] = useState<string[]>(
    () => resolveInitialState(foodParam, regionParam, new Map()).genres,
  );
  const [activeFood, setActiveFood] = useState<ActiveFoodSelection | null>(() =>
    resolveInitialState(foodParam, regionParam, new Map()).food,
  );
  const [fitTrigger, setFitTrigger] = useState(0);

  // 선택된 핀 & 리뷰 시트 상태
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [reviewSheetPlace, setReviewSheetPlace] = useState<EatplPlace | null>(
    null,
  );
  const [localReviewsByPlace, setLocalReviewsByPlace] = useState<
    Record<string, PlaceReviewItem[]>
  >({});

  const listCardRefs = useRef<Map<string, HTMLElement>>(new Map());

  // 정적 region-codes.json에서 전국 230개 시·군·구 로드 (백엔드 없이 0ms 자동완성)
  useEffect(() => {
    const controller = new AbortController();

    fetch("/images/maps/region-codes.json", { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json() as Promise<RawRegionMeta>;
      })
      .then((meta) => {
        const parentMap = new Map<string, string>();
        const list: RegionItem[] = meta.territories.map((t) => {
          const parentCode = t.parentCode ?? t.code.slice(0, 2);
          parentMap.set(t.code, parentCode);
          const [lng, lat] = t.labelPoint ?? [null, null];
          return {
            code: t.code,
            name: t.name,
            fullName: formatTravelFullName(parentCode, t.name),
            centerLat: lat,
            centerLng: lng,
          };
        });
        setAllProvinces(sortProvincesByTravelName(meta.provinces));
        setParentCodeByRegion(parentMap);
        setAllRegions(list);
      })
      .catch(() => {
        // 로드 실패 시 기본 지역 유지
      });

    return () => controller.abort();
  }, []);

  const regionByCode = useMemo(() => {
    const map = new Map<string, RegionItem>();
    for (const r of allRegions) map.set(r.code, r);
    return map;
  }, [allRegions]);

  // URL 쿼리(/?food=... 또는 /?region=...) 외부 진입 동기화
  // 쿼리가 비어 있는('/') 상태로 돌아갈 때는 이전 버튼 탐색을 방해하지 않도록 서울로 리셋하지 않는다.
  const lastSyncedSignatureRef = useRef(
    `${foodParam ?? ""}|${regionParam ?? ""}`,
  );
  useEffect(() => {
    if (!foodParam && !regionParam) {
      lastSyncedSignatureRef.current = "|";
      return;
    }

    const signature = `${foodParam ?? ""}|${regionParam ?? ""}`;
    if (lastSyncedSignatureRef.current === signature) {
      return;
    }
    if (regionParam && !regionByCode.has(regionParam)) {
      return;
    }

    lastSyncedSignatureRef.current = signature;
    const next = resolveInitialState(foodParam, regionParam, regionByCode);
    const id = requestAnimationFrame(() => {
      setBrowsingProvinceCode(null);
      setSelectedRegion(next.region);
      setSelectedGenres(next.genres);
      setActiveFood(next.food);
      setSelectedPlaceId(null);
      if (next.food) setMapMode("restaurants");
      setFitTrigger((n) => n + 1);
    });
    return () => cancelAnimationFrame(id);
  }, [foodParam, regionParam, regionByCode]);

  // 현재 위치 기준 시·군·구 선택 (초기 진입 자동 실행 + 지도 상단 '내 위치' 버튼 공용)
  const locateCurrentRegion = useCallback(
    (regions: readonly RegionItem[], byUserClick: boolean) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        if (byUserClick) {
          showToast("이 브라우저에서는 위치 정보를 사용할 수 없어요");
        }
        return;
      }

      if (byUserClick) setLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (byUserClick) setLocating(false);
          const { latitude: lat, longitude: lng } = pos.coords;
          setUserLocation({ lat, lng });
          const nearest = findNearestRegion(lat, lng, regions);
          if (nearest) {
            setActiveFood(null);
            setBrowsingProvinceCode(null);
            setSelectedRegion(nearest);
            setSelectedPlaceId(null);
            if (byUserClick) setMapMode("restaurants");
            setFitTrigger((n) => n + 1);
            if (byUserClick) {
              lastSyncedSignatureRef.current = `|${nearest.code}`;
              syncBrowserUrl(
                `/?region=${nearest.code}`,
                `${nearest.fullName} 여행 맛집 지도 | ${SITE_NAME}`,
              );
            }
          } else if (byUserClick) {
            showToast("현재 위치가 한국 지역 범위를 벗어나 있어요");
          }
        },
        () => {
          if (byUserClick) {
            setLocating(false);
            showToast("위치 권한을 허용하면 현재 위치 지역을 바로 찾을 수 있어요");
          }
        },
        { enableHighAccuracy: false, timeout: 6000, maximumAge: 300_000 },
      );
    },
    [showToast],
  );

  // URL 쿼리(/?food=, /?region=) 및 /travel/[slug] 지정 진입이 없을 때만 현재 위치 기준 자동 선택
  useEffect(() => {
    if (geoInitializedRef.current) return;
    if (foodParam || regionParam || initialProvinceCode || initialRegion) {
      geoInitializedRef.current = true;
      return;
    }
    if (allRegions.length <= 1) return;

    geoInitializedRef.current = true;
    const id = requestAnimationFrame(() => {
      locateCurrentRegion(allRegions, false);
    });
    return () => cancelAnimationFrame(id);
  }, [
    allRegions,
    foodParam,
    regionParam,
    initialProvinceCode,
    initialRegion,
    locateCurrentRegion,
  ]);

  // 검색어 기반 시·군·구 즉시 필터링 (친숙한 여행지명 + 공식 행정명 별칭 모두 지원, 최대 10개)
  const regionSuggestions = useMemo(() => {
    const q = regionQuery.trim().toLowerCase();
    if (!q) return [];

    return allRegions
      .filter((r) => {
        const parentCode =
          parentCodeByRegion.get(r.code) ?? r.code.slice(0, 2);
        return getRegionSearchText(parentCode, r.name, r.fullName).includes(q);
      })
      .sort((a, b) => {
        const aExact = a.name.toLowerCase() === q ? 0 : 1;
        const bExact = b.name.toLowerCase() === q ? 0 : 1;
        if (aExact !== bExact) return aExact - bExact;
        const aStarts = a.name.toLowerCase().startsWith(q) ? 0 : 1;
        const bStarts = b.name.toLowerCase().startsWith(q) ? 0 : 1;
        if (aStarts !== bStarts) return aStarts - bStarts;
        return a.code.localeCompare(b.code);
      })
      .slice(0, 10);
  }, [regionQuery, allRegions, parentCodeByRegion]);

  // 장소 검색에서 시·군·구로 바꿀 수 있는 지역 코드 목록
  const knownRegionCodes = useMemo(() => new Set(allRegions.map((r) => r.code)), [allRegions]);

  // 공유 영토 땅따먹기 주인 맵 (실제: GET /territories, 예시 모드: 예시 데이터)
  const apiOwners = useTerritoryOwners(apiBase);
  const ownersByRegion = useMemo(() => {
    const map = new Map<string, TerritoryOwner>();
    for (const owner of isPreview ? MOCK_TERRITORY_OWNERS : apiOwners) {
      map.set(owner.regionCode, owner);
    }
    return map;
  }, [isPreview, apiOwners]);

  // 식당 검색 결과
  // - 실제 모드: GET /restaurants?regionCode=&genre= (업종 여러 개면 업종마다 조회해 합침). 음식 진입(/?food=slug)은 프리셋의 지역·업종으로 조회한다.
  // - 예시 모드(/?preview=1 또는 API 미설정): buildMockSearchResult 결과를 표시한다.
  const apiSearch = useMapRestaurants(
    apiBase,
    selectedRegion?.code ?? null,
    selectedGenres,
    searchAttempt,
  );
  const mockResult = useMemo(() => {
    if (!isPreview || !selectedRegion) return null;
    return buildMockSearchResult(selectedRegion, {
      genres: selectedGenres,
      foodLabel: activeFood?.name ?? null,
    });
  }, [isPreview, selectedRegion, selectedGenres, activeFood]);
  const result = isPreview ? mockResult : apiSearch.result;
  const searchLoading = !isPreview && apiSearch.loading;
  const searchError = isPreview ? "" : apiSearch.error;

  const allPlaces = result?.items ?? [];
  // 목록·지도 핀은 한 페이지씩 그린다. 지역·업종·재시도가 바뀌면 첫 페이지부터 다시 보여 준다.
  const listKey = `${selectedRegion?.code ?? ""}|${selectedGenres.join(",")}|${searchAttempt}|${isPreview}`;
  const [shownState, setShownState] = useState({
    key: listKey,
    count: PLACE_PAGE_SIZE,
  });
  const shownCount =
    shownState.key === listKey ? shownState.count : PLACE_PAGE_SIZE;
  const { visible: places, remaining: remainingPlaces } = pagePlaces(
    allPlaces,
    shownCount,
  );
  const currentOwner = selectedRegion
    ? ownersByRegion.get(selectedRegion.code)
    : undefined;
  const regionCenter =
    selectedRegion?.centerLat != null && selectedRegion?.centerLng != null
      ? { lat: selectedRegion.centerLat, lng: selectedRegion.centerLng }
      : null;

  const provinceByCode = useMemo(() => {
    const map = new Map<string, { code: string; name: string }>();
    for (const p of allProvinces) map.set(p.code, p);
    return map;
  }, [allProvinces]);

  const browsingProvince = browsingProvinceCode
    ? (provinceByCode.get(browsingProvinceCode) ?? null)
    : null;

  const districtsOfBrowsingProvince = useMemo(() => {
    if (!browsingProvinceCode) return [];
    const list = allRegions.filter(
      (r) =>
        (parentCodeByRegion.get(r.code) ?? r.code.slice(0, 2)) ===
        browsingProvinceCode,
    );
    return sortRegions(list);
  }, [browsingProvinceCode, allRegions, parentCodeByRegion]);

  const selectedParentCode = selectedRegion
    ? (parentCodeByRegion.get(selectedRegion.code) ??
      selectedRegion.code.slice(0, 2))
    : null;
  const selectedParentProvince = selectedParentCode
    ? (provinceByCode.get(selectedParentCode) ?? null)
    : null;

  // 뒤로가기 대상 이름: 같은 시·도에 시·군·구가 여럿이면 그 시·도, 아니면 전국
  const backLabel =
    selectedRegion &&
    selectedParentProvince &&
    allRegions.filter(
      (r) =>
        (parentCodeByRegion.get(r.code) ?? r.code.slice(0, 2)) ===
        selectedParentCode,
    ).length > 1
      ? getTravelProvinceName(
          selectedParentProvince.code,
          selectedParentProvince.name,
        )
      : "전국";

  // --- 사용자 인터랙션 핸들러 ---

  const clearRegionSelection = useCallback(
    (nextProvinceCode: string | null = null) => {
      setSelectedRegion(null);
      setBrowsingProvinceCode(nextProvinceCode);
      setSelectedGenres([]);
      setActiveFood(null);
      setFilterOpen(false);
      setSelectedPlaceId(null);
      setFocusProvinceTrigger((n) => n + 1);
      lastSyncedSignatureRef.current = "|";
      const label = nextProvinceCode
        ? getTravelProvinceName(nextProvinceCode)
        : "";
      syncBrowserUrl(
        "/",
        label
          ? `${label} 여행지 · 맛집 지도 | ${SITE_NAME}`
          : `전국 국내 여행지 맛집 지도 · 미식 여행 | ${SITE_NAME}`,
      );
    },
    [],
  );

  const handleSelectProvinceFromList = useCallback(
    (provinceCode: string) => {
      const children = allRegions.filter(
        (r) =>
          (parentCodeByRegion.get(r.code) ?? r.code.slice(0, 2)) ===
          provinceCode,
      );
      // 세종처럼 하위 시·군·구가 1곳뿐이면 바로 해당 지역 식당으로 진입
      if (children.length === 1) {
        setRegionQuery("");
        setActiveFood(null);
        setBrowsingProvinceCode(null);
        setSelectedRegion(children[0]);
        setSelectedPlaceId(null);
        setFitTrigger((n) => n + 1);
        lastSyncedSignatureRef.current = `|${children[0].code}`;
        syncBrowserUrl(
          `/?region=${children[0].code}`,
          `${children[0].fullName} 여행 맛집 지도 | ${SITE_NAME}`,
        );
        return;
      }

      setBrowsingProvinceCode(provinceCode);
      setFocusProvinceTrigger((n) => n + 1);
      const label = getTravelProvinceName(provinceCode);
      syncBrowserUrl(
        "/",
        label ? `${label} 여행지 · 맛집 지도 | ${SITE_NAME}` : undefined,
      );
    },
    [allRegions, parentCodeByRegion],
  );

  const handleSelectProvinceFromMap = useCallback(
    (provinceCode: string) => {
      const children = allRegions.filter(
        (r) =>
          (parentCodeByRegion.get(r.code) ?? r.code.slice(0, 2)) ===
          provinceCode,
      );
      if (children.length === 1) {
        setActiveFood(null);
        setBrowsingProvinceCode(null);
        setSelectedRegion(children[0]);
        setSelectedPlaceId(null);
        setFitTrigger((n) => n + 1);
        lastSyncedSignatureRef.current = `|${children[0].code}`;
        syncBrowserUrl(
          `/?region=${children[0].code}`,
          `${children[0].fullName} 여행 맛집 지도 | ${SITE_NAME}`,
        );
        return;
      }

      setSelectedRegion(null);
      setSelectedGenres([]);
      setActiveFood(null);
      setFilterOpen(false);
      setSelectedPlaceId(null);
      setBrowsingProvinceCode(provinceCode);
      lastSyncedSignatureRef.current = "|";
      const label = getTravelProvinceName(provinceCode);
      syncBrowserUrl(
        "/",
        label ? `${label} 여행지 · 맛집 지도 | ${SITE_NAME}` : undefined,
      );
    },
    [allRegions, parentCodeByRegion],
  );

  const handleSelectRegion = useCallback((region: RegionItem) => {
    setRegionQuery("");
    setPlaceNoteState(null);
    setActiveFood(null);
    setBrowsingProvinceCode(null);
    setSelectedRegion(region);
    setSelectedPlaceId(null);
    setFitTrigger((n) => n + 1);
    lastSyncedSignatureRef.current = `|${region.code}`;
    syncBrowserUrl(
      `/?region=${region.code}`,
      `${region.fullName} 여행 맛집 지도 | ${SITE_NAME}`,
    );
  }, []);

  const handleSelectPlace = useCallback(
    (place: PlaceResult) => {
      const region = allRegions.find((r) => r.code === place.regionCode);
      if (!region) return;
      handleSelectRegion(region);
      setPlaceNoteState({ regionCode: region.code, text: placeNote(place.name, region.fullName) });
    },
    [allRegions, handleSelectRegion],
  );

  const handleBackStep = useCallback(() => {
    if (selectedRegion) {
      const parentCode =
        parentCodeByRegion.get(selectedRegion.code) ??
        selectedRegion.code.slice(0, 2);
      const siblingCount = allRegions.filter(
        (r) =>
          (parentCodeByRegion.get(r.code) ?? r.code.slice(0, 2)) === parentCode,
      ).length;
      clearRegionSelection(siblingCount > 1 ? parentCode : null);
      return;
    }
    if (browsingProvinceCode) {
      setBrowsingProvinceCode(null);
      setFocusProvinceTrigger((n) => n + 1);
      syncBrowserUrl(
        "/",
        `전국 국내 여행지 맛집 지도 · 미식 여행 | ${SITE_NAME}`,
      );
    }
  }, [
    selectedRegion,
    browsingProvinceCode,
    parentCodeByRegion,
    allRegions,
    clearRegionSelection,
  ]);

  // 업종 필터 다중 선택 토글 (여러 개 연속 선택 가능하도록 패널 유지)
  const handleToggleGenre = (genre: string) => {
    setActiveFood(null);
    setSelectedPlaceId(null);
    if (!selectedGenres.includes(genre) && selectedGenres.length >= MAX_GENRES) {
      showToast(`업종은 ${MAX_GENRES}개까지 고를 수 있어요`);
      return;
    }
    setSelectedGenres((prev) =>
      prev.includes(genre)
        ? prev.filter((item) => item !== genre)
        : [...prev, genre],
    );
    if (selectedRegion) {
      setFitTrigger((n) => n + 1);
    } else {
      showToast("먼저 여행지를 선택하면 고른 업종 식당을 보여드려요");
    }
  };

  const handleClearGenres = () => {
    setActiveFood(null);
    setSelectedGenres([]);
    setSelectedPlaceId(null);
    if (selectedRegion) {
      setFitTrigger((n) => n + 1);
    }
  };

  const handleClearFood = () => {
    setActiveFood(null);
    setSelectedGenres([]);
    setSelectedPlaceId(null);
    if (selectedRegion) {
      lastSyncedSignatureRef.current = `|${selectedRegion.code}`;
      syncBrowserUrl(
        `/?region=${selectedRegion.code}`,
        `${selectedRegion.fullName} 여행 맛집 지도 | ${SITE_NAME}`,
      );
      setFitTrigger((n) => n + 1);
    } else {
      clearRegionSelection();
    }
  };

  const handleSelectPlaceFromMap = useCallback((place: EatplPlace) => {
    setSelectedPlaceId(place.id);
    requestAnimationFrame(() => {
      const cardEl = listCardRefs.current.get(place.id);
      cardEl?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }, []);

  const openReviewSheet = (place: EatplPlace) => {
    setSelectedPlaceId(place.id);
    setReviewSheetPlace(place);
  };

  const createdObjectUrlsRef = useRef<string[]>([]);

  // 페이지 이탈(언마운트) 시 로컬 예시 리뷰 사진의 object URL을 일괄 해제한다.
  useEffect(() => {
    return () => {
      for (const url of createdObjectUrlsRef.current) {
        URL.revokeObjectURL(url);
      }
      createdObjectUrlsRef.current = [];
    };
  }, []);

  const handleAddLocalReview = (placeId: string, review: PlaceReviewItem) => {
    if (review.photos?.length) {
      for (const url of review.photos) {
        if (url.startsWith("blob:")) {
          createdObjectUrlsRef.current.push(url);
        }
      }
    }
    setLocalReviewsByPlace((prev) => ({
      ...prev,
      [placeId]: [review, ...(prev[placeId] ?? [])],
    }));
    showToast(review.saved ? "리뷰를 저장했어요" : "리뷰를 남겼어요(예시)");
  };

  const visibleGenres = useMemo(() => {
    if (!showAllGenres) return [...QUICK_GENRES];
    return [
      ...new Set([...QUICK_GENRES, ...MOCK_GENRES.major, ...MOCK_GENRES.minor]),
    ];
  }, [showAllGenres]);

  return (
    // 모바일: 제목·검색 → 지도(높이 고정) → 목록(이 영역만 스크롤) 세로 줄. 넓은 화면: 왼쪽 목록 + 오른쪽 지도 2열
    <main className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col gap-2 px-5 pt-2 pb-3 md:px-8 lg:flex-none lg:grid lg:h-dvh lg:grid-cols-[minmax(320px,388px)_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] lg:gap-7 lg:overflow-hidden lg:py-6">
      {/* 왼쪽: EatsMine 에디토리얼 탐색·식당 목록 컬럼 */}
      <aside
        id="map-list-panel"
        aria-label="지역 및 맛집 탐색"
        // 모바일에서는 틀(display: contents)을 없애 제목·검색·목록이 지도와 같은 줄에서 순서를 갖게 한다.
        className="contents lg:order-1 lg:flex lg:min-h-0 lg:min-w-0 lg:flex-col lg:gap-4"
      >
        {/* 뒤로가기 브레드크럼 + 큰 제목 + 땅 주인 */}
        <header className="order-1 flex flex-col gap-0.5 lg:order-none lg:gap-1">
          {(selectedRegion || browsingProvince) && (
            // 넓은 화면: 제목 위 '← 상위 지역' 줄. 모바일은 제목 왼쪽 아이콘 버튼으로 대신한다.
            <button
              type="button"
              onClick={handleBackStep}
              className="pressable -ml-2 hidden min-h-9 w-fit items-center gap-0.5 rounded-input px-2 text-sm font-semibold text-accent-dark focus-ring lg:inline-flex"
            >
              <Icon name="back" size={16} />
              <span>{backLabel}</span>
            </button>
          )}

          <div className="flex items-start justify-between gap-2">
            {(selectedRegion || browsingProvince) && (
              <button
                type="button"
                onClick={handleBackStep}
                aria-label={`${backLabel} 목록으로 돌아가기`}
                className="pressable -ml-2 inline-flex size-8 shrink-0 items-center justify-center rounded-input text-accent-dark focus-ring lg:hidden"
              >
                <Icon name="back" size={18} />
              </button>
            )}
            <h1 className="min-w-0 flex-1 break-keep pt-0.5 text-lg leading-7 font-bold tracking-tight text-foreground lg:flex-none lg:pt-0 lg:type-title">
              {selectedRegion
                ? selectedRegion.fullName
                : browsingProvince
                  ? getTravelProvinceName(
                      browsingProvince.code,
                      browsingProvince.name,
                    )
                  : browsingProvinceCode
                    ? getTravelProvinceName(browsingProvinceCode) ||
                      "어디로 떠나볼까요?"
                    : "어디로 떠나볼까요?"}
            </h1>
            {selectedRegion ? (
              <span className="type-caption shrink-0 pt-1.5 font-medium text-muted tabular-nums max-lg:pt-1">
                {allPlaces.length}곳
              </span>
            ) : browsingProvince ? (
              <span className="type-caption shrink-0 pt-1.5 font-medium text-muted tabular-nums max-lg:pt-1">
                {districtsOfBrowsingProvince.length}곳
              </span>
            ) : null}
          </div>

          {selectedRegion && (currentOwner || selectedGenres.length > 0) && (
            <div className="flex flex-wrap items-center gap-1.5 lg:mt-0.5">
              {currentOwner && (
                <p className="type-caption mr-1 text-muted">
                  땅 주인{" "}
                  <span className="font-semibold text-foreground">
                    {currentOwner.ownerNickname}
                  </span>{" "}
                  · 리뷰 {currentOwner.reviewCount}
                  {isPreview ? "(예시)" : ""}
                </p>
              )}
              {selectedGenres.map((genre) => (
                <button
                  key={genre}
                  type="button"
                  onClick={() => handleToggleGenre(genre)}
                  aria-label={`${genre} 필터 해제`}
                  className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-full bg-accent-weak px-2.5 py-0.5 text-[11px] font-medium text-accent-dark hover:opacity-80 focus-ring"
                >
                  <span>{genre}</span>
                  <Icon name="close" size={11} />
                </button>
              ))}
            </div>
          )}
        </header>

        {/* 지역 검색 + 숨김형 업종 필터 */}
        <div className="order-2 flex flex-col gap-2.5 lg:order-none">
          <div className="flex items-center gap-2">
            <MapSearchBox
              query={regionQuery}
              onQueryChange={setRegionQuery}
              regions={regionSuggestions}
              knownRegionCodes={knownRegionCodes}
              onSelectRegion={handleSelectRegion}
              onSelectPlace={handleSelectPlace}
            />

            {/* 업종 필터 열기/닫기 버튼 (다중 선택 개수 표시) */}
            <button
              type="button"
              aria-expanded={filterOpen}
              aria-controls="genre-filter-panel"
              onClick={() => setFilterOpen((prev) => !prev)}
              className={
                "pressable inline-flex h-11 shrink-0 items-center gap-1.5 rounded-input border px-3.5 text-xs font-medium transition-colors focus-ring " +
                (filterOpen || selectedGenres.length > 0
                  ? "border-accent bg-accent-weak text-accent-dark"
                  : "border-line bg-surface/75 text-foreground hover:bg-surface")
              }
            >
              <Icon name="filter" size={14} />
              <span>
                {selectedGenres.length === 0
                  ? "필터"
                  : selectedGenres.length === 1
                    ? selectedGenres[0]
                    : `${selectedGenres[0]} 외 ${selectedGenres.length - 1}`}
              </span>
            </button>
          </div>

          {placeNoteState && selectedRegion?.code === placeNoteState.regionCode && (
            <p role="status" className="type-body text-foreground">
              {placeNoteState.text}
            </p>
          )}

          {/* 숨겨진 업종 필터 패널 ('필터' 버튼 클릭 시에만 표시 · 중복 선택 지원) */}
          {filterOpen && (
            <div
              id="genre-filter-panel"
              className="flex flex-col gap-2 rounded-card border border-line bg-surface/90 p-3.5 shadow-card"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">
                  업종 선택
                  {selectedGenres.length > 0 && (
                    <span className="ml-1.5 font-medium text-accent-dark tabular-nums">
                      {selectedGenres.length}개
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowAllGenres((prev) => !prev)}
                    className="cursor-pointer text-xs font-medium text-muted hover:text-foreground focus-ring"
                  >
                    {showAllGenres ? "주요 업종만" : "전체 43종"}
                  </button>
                  <button
                    type="button"
                    aria-label="업종 필터 닫기"
                    onClick={() => setFilterOpen(false)}
                    className="cursor-pointer text-muted hover:text-foreground focus-ring"
                  >
                    <Icon name="close" size={14} />
                  </button>
                </div>
              </div>
              <div
                role="group"
                aria-label="업종 필터 (중복 선택 가능)"
                className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto py-0.5"
              >
                <FilterChip
                  selected={selectedGenres.length === 0}
                  onSelectedChange={handleClearGenres}
                >
                  전체
                </FilterChip>
                {visibleGenres.map((genre) => (
                  <FilterChip
                    key={genre}
                    selected={selectedGenres.includes(genre)}
                    onSelectedChange={() => handleToggleGenre(genre)}
                  >
                    {genre}
                  </FilterChip>
                ))}
              </div>
            </div>
          )}

          {/* 도감(/?food=)에서 넘어왔을 때만 표시되는 활성 제철음식 배너 */}
          {activeFood && (
            <div className="flex items-center justify-between gap-2 rounded-card border border-accent/25 bg-accent-weak/75 px-3.5 py-2.5">
              <div className="flex min-w-0 items-center gap-1.5">
                <Icon
                  name="leaf"
                  size={15}
                  className="shrink-0 text-accent-dark"
                />
                <p className="truncate text-sm font-semibold text-foreground">
                  {activeFood.name}
                </p>
              </div>
              <button
                type="button"
                onClick={handleClearFood}
                aria-label="제철음식 필터 해제"
                className="pressable inline-flex size-7 shrink-0 items-center justify-center rounded-full text-muted hover:text-foreground"
              >
                <Icon name="close" size={15} />
              </button>
            </div>
          )}
        </div>

        {/* 지역 드릴다운 목록(미선택 시) 또는 식당 목록 스크롤 영역 */}
        {/* relative: 카드 안 sr-only(absolute) 글자가 문서 기준으로 빠져나가 페이지 높이를 늘리지 않게 이 영역 안에 가둔다 */}
        <div className="relative order-4 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-0.5 lg:order-none">
          {!selectedRegion ? (
            <div className="overflow-hidden rounded-card border border-line bg-surface/75">
              {browsingProvince ? (
                <ul
                  aria-label={`${getTravelProvinceName(browsingProvince.code, browsingProvince.name)} 시·군·구 목록`}
                  className="divide-y divide-line"
                >
                  {districtsOfBrowsingProvince.map((district) => (
                    <li key={district.code}>
                      <button
                        type="button"
                        onClick={() => handleSelectRegion(district)}
                        className="pressable flex min-h-11 w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-foreground hover:bg-fill/70 focus-ring"
                      >
                        <span className="truncate">{district.name}</span>
                        <Icon
                          name="chevron-right"
                          size={15}
                          className="shrink-0 text-muted"
                        />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <ul
                  aria-label="전국 시·도 목록"
                  className="divide-y divide-line"
                >
                  {allProvinces.map((province) => (
                    <li key={province.code}>
                      <button
                        type="button"
                        onClick={() =>
                          handleSelectProvinceFromList(province.code)
                        }
                        className="pressable flex min-h-11 w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-foreground hover:bg-fill/70 focus-ring"
                      >
                        <span className="truncate">
                          {getTravelProvinceName(province.code, province.name)}
                        </span>
                        <Icon
                          name="chevron-right"
                          size={15}
                          className="shrink-0 text-muted"
                        />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : searchLoading ? (
            <div aria-busy="true" aria-label="식당 목록을 불러오는 중">
              {Array.from({ length: 4 }, (_, i) => (
                <SkeletonRow key={i} />
              ))}
            </div>
          ) : searchError ? (
            <EmptyState
              illustration="load-error"
              message={searchError}
              action={
                <ActionButton
                  variant="tinted"
                  size="sm"
                  onClick={() => setSearchAttempt((n) => n + 1)}
                >
                  다시 시도
                </ActionButton>
              }
            />
          ) : allPlaces.length === 0 ? (
            <EmptyState
              illustration="empty-search"
              message={
                selectedGenres.length
                  ? "고른 업종의 식당이 없어요. 필터를 바꿔 보세요."
                  : "이 지역의 식당 정보를 찾지 못했어요."
              }
            />
          ) : (
            <ul
              aria-label={isPreview ? "식당 목록(예시)" : "식당 목록"}
              className="divide-y divide-line"
            >
              {places.map((place) => {
                const isSelected = place.id === selectedPlaceId;
                // 예시 모드는 예시 리뷰, 실제 모드는 api의 공개 리뷰 요약(없으면 null)을 쓴다.
                const sample = isPreview
                  ? getSamplePlaceReviews(place, localReviewsByPlace[place.id])
                  : null;
                const cardReview = sample
                  ? {
                      average: sample.averageRating,
                      count: sample.reviewCount,
                      excerpt: sample.featuredReview.content,
                    }
                  : toCardReview(place.reviewSummary);
                // 잇플 외부 링크는 home-contract의 validEatplUrl로 검증한 API 응답 원본만 사용한다(쿼리 추가·변형 금지).
                const safeEatplUrl = validEatplUrl(place.merUrl);

                return (
                  <li
                    key={place.id}
                    ref={(el) => {
                      if (el) listCardRefs.current.set(place.id, el);
                      else listCardRefs.current.delete(place.id);
                    }}
                  >
                    <article
                      onClick={() => setSelectedPlaceId(place.id)}
                      className={
                        "flex flex-col gap-2.5 rounded-card px-2 py-3.5 transition-colors " +
                        (isSelected ? "bg-accent-weak/45" : "")
                      }
                    >
                      {/* 상단 가로: 컴팩트 이미지 슬롯 + 식당명 · 주소 · 업종 · 매출/영업시간 (사진·이름 → 잇플 상세) */}
                      <div className="flex items-start gap-3">
                        {(() => {
                          const thumbClass =
                            "flex h-20 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-fill";
                          // 매장 사진 → 공개 리뷰 대표 사진(예시 모드 제외) → 업종 도감 그림
                          const photo = isPreview ? null : cardPhotoUrl(place);
                          const thumb = photo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={photo}
                              alt=""
                              loading="lazy"
                              className="size-full object-cover"
                              // 서명 URL이 만료됐거나 못 불러오면 업종 그림으로 바꾼다.
                              onError={(event) => {
                                const img = event.currentTarget;
                                if (img.dataset.fallback) return;
                                img.dataset.fallback = "1";
                                img.src = genreIllustration(place.genre);
                                img.className = "size-16 object-contain";
                              }}
                            />
                          ) : (
                            // 잇플에는 가게 사진이 없어 업종에 맞는 도감 그림으로 대신한다(그 메뉴가 있다는 뜻은 아님).
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={genreIllustration(place.genre)}
                              alt=""
                              width={64}
                              height={64}
                              loading="lazy"
                              className="size-16 object-contain"
                            />
                          );
                          // 키보드·스크린리더는 이름 링크 하나로 이동하고, 사진 링크는 마우스·터치용으로만 둔다.
                          return safeEatplUrl ? (
                            <a
                              href={safeEatplUrl}
                              target="_blank"
                              rel="noopener"
                              tabIndex={-1}
                              aria-hidden="true"
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedPlaceId(place.id);
                                trackOutbound(
                                  safeEatplUrl,
                                  "list",
                                  selectedRegion?.code,
                                );
                              }}
                              className={`${thumbClass} pressable`}
                            >
                              {thumb}
                            </a>
                          ) : (
                            <div aria-hidden="true" className={thumbClass}>
                              {thumb}
                            </div>
                          );
                        })()}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <h2 className="truncate text-[15px] font-semibold tracking-tight text-foreground">
                              {safeEatplUrl ? (
                                <a
                                  href={safeEatplUrl}
                                  target="_blank"
                                  rel="noopener"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setSelectedPlaceId(place.id);
                                    trackOutbound(
                                      safeEatplUrl,
                                      "list",
                                      selectedRegion?.code,
                                    );
                                  }}
                                  className="rounded-input hover:underline underline-offset-4 focus-ring"
                                >
                                  {place.name}
                                  <span className="sr-only">
                                    {" "}
                                    (가게 상세, 새 창)
                                  </span>
                                </a>
                              ) : (
                                place.name
                              )}
                            </h2>
                            {place.genre && (
                              <span className="shrink-0 text-[11px] font-medium text-muted">
                                {place.genre}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 truncate text-xs text-muted">
                            {place.address}
                          </p>
                          {(place.rankNational != null ||
                            place.estimatedHours) && (
                            <p className="mt-1.5 truncate text-[11px] text-muted tabular-nums">
                              {[
                                place.rankNational != null
                                  ? `전국 상위 ${place.rankNational.toFixed(1)}%`
                                  : null,
                                place.estimatedHours
                                  ? `${place.estimatedHours.start}–${place.estimatedHours.end}`
                                  : null,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* 중단: 평점 · 대표 리뷰(최대 2줄). 보여 주기만 하고, 리뷰 창은 아래 '리뷰 보기'로만 연다 */}
                      <div className="px-1 py-1">
                        {cardReview ? (
                          <>
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-foreground tabular-nums">
                              <Icon
                                name="star"
                                size={12}
                                className="shrink-0 text-star"
                              />
                              <span>
                                {cardReview.average.toFixed(1)} · 리뷰{" "}
                                {cardReview.count}개
                                {sample ? "(예시)" : ""}
                              </span>
                            </span>
                            {cardReview.excerpt && (
                              <span className="mt-0.5 block line-clamp-2 text-xs leading-relaxed text-muted">
                                {cardReview.excerpt}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-muted">
                            아직 공개된 리뷰가 없어요. 첫 리뷰를 남겨 보세요.
                          </span>
                        )}
                      </div>

                      {/* 하단 액션 줄: 리뷰 보기 */}
                      <div className="flex items-center gap-3 px-1">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openReviewSheet(place);
                          }}
                          className="pressable inline-flex min-h-8 items-center gap-0.5 rounded-input text-xs font-semibold text-accent-dark underline underline-offset-4 focus-ring"
                        >
                          <span>리뷰 보기</span>
                          <span aria-hidden="true">›</span>
                        </button>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>
          )}

          {selectedRegion &&
            !searchLoading &&
            !searchError &&
            remainingPlaces > 0 && (
              <div className="mt-2 flex justify-center">
                <ActionButton
                  variant="tinted"
                  size="sm"
                  onClick={() =>
                    setShownState({
                      key: listKey,
                      count: places.length + PLACE_PAGE_SIZE,
                    })
                  }
                >
                  더 보기 ({places.length} / {allPlaces.length})
                </ActionButton>
              </div>
            )}

          {result && (
            <p className="mt-3 px-1 pb-2 text-center text-[11px] text-muted">
              {result.source}
            </p>
          )}
        </div>
      </aside>

      {/* 오른쪽: 둥근 EatsMine 지도 카드 프레임 (실제 좌표 식당 지도 ↔ 연속 영토 땅따먹기) */}
      <section
        aria-label="지도 영역"
        className="relative order-3 h-[38dvh] min-h-[240px] w-full shrink-0 overflow-hidden rounded-card border border-line bg-surface/45 lg:order-2 lg:h-full lg:min-h-0 lg:shadow-card"
      >
        {/* 우상단 컨트롤: 내 위치 버튼 + 슬라이드 모드 전환 (모바일에서 좌상단 '← 전국'과 겹치지 않도록 컴팩트 반응형) */}
        <div className="pointer-events-none absolute top-2.5 right-2.5 z-30 flex items-center justify-end gap-1.5 sm:top-4 sm:right-4 sm:gap-2">
          <button
            type="button"
            disabled={locating}
            aria-label={locating ? "현재 위치 확인 중" : "내 위치로 이동"}
            title="내 위치"
            onClick={() => locateCurrentRegion(allRegions, true)}
            className="glass-bar pressable pointer-events-auto inline-flex size-9 items-center justify-center gap-1.5 rounded-full text-xs font-semibold text-foreground shadow-[inset_0_0_0_1px_var(--color-line)] focus-ring disabled:opacity-60 sm:h-10 sm:w-auto sm:px-3.5"
          >
            <Icon name="locate" size={15} className="shrink-0 text-accent-dark" />
            <span className="hidden sm:inline">
              {locating ? "확인 중…" : "내 위치"}
            </span>
          </button>

          <div
            role="radiogroup"
            aria-label="지도 표시 모드"
            className="glass-bar pointer-events-auto relative grid h-9 w-[164px] grid-cols-2 items-center rounded-full p-1 shadow-[inset_0_0_0_1px_var(--color-line)] sm:h-10 sm:w-[204px]"
          >
            <span
              aria-hidden="true"
              className={
                "pointer-events-none absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-full bg-accent shadow-sm transition-transform duration-200 ease-out " +
                (mapMode === "territory" ? "translate-x-full" : "translate-x-0")
              }
            />
            <button
              type="button"
              role="radio"
              aria-checked={mapMode === "restaurants"}
              onClick={() => setMapMode("restaurants")}
              className={
                "relative z-10 inline-flex h-full cursor-pointer items-center justify-center gap-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors focus-ring sm:gap-1.5 sm:text-xs " +
                (mapMode === "restaurants"
                  ? "text-on-accent"
                  : "text-muted hover:text-foreground")
              }
            >
              <Icon name="pin" size={13} className="shrink-0 sm:size-[14px]" />
              <span>식당 보기</span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={mapMode === "territory"}
              onClick={() => setMapMode("territory")}
              className={
                "relative z-10 inline-flex h-full cursor-pointer items-center justify-center gap-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors focus-ring sm:gap-1.5 sm:text-xs " +
                (mapMode === "territory"
                  ? "text-on-accent"
                  : "text-muted hover:text-foreground")
              }
            >
              <Icon
                name="territory"
                size={13}
                className="shrink-0 sm:size-[14px]"
              />
              <span>영토 표시</span>
            </button>
          </div>
        </div>

        {/* 통합 지도 */}
        <InteractiveTileMap
          mode={mapMode}
          places={places}
          selectedPlaceId={selectedPlaceId}
          onSelectPlace={handleSelectPlaceFromMap}
          regionCenter={regionCenter}
          userLocation={userLocation}
          fitTrigger={fitTrigger}
          ownersByRegion={ownersByRegion}
          isSampleOwners={isPreview}
          selectedRegionCode={selectedRegion?.code ?? null}
          onSelectRegion={handleSelectRegion}
          focusProvinceCode={browsingProvinceCode}
          focusProvinceTrigger={focusProvinceTrigger}
          onSelectProvince={handleSelectProvinceFromMap}
        />
      </section>

      {/* 식당 리뷰 보기 · 작성 시트 & 토스트 */}
      <RestaurantReviewSheet
        place={reviewSheetPlace}
        userReviews={
          reviewSheetPlace
            ? (localReviewsByPlace[reviewSheetPlace.id] ?? [])
            : []
        }
        onClose={() => setReviewSheetPlace(null)}
        onAddReview={handleAddLocalReview}
      />
      {toast}
    </main>
  );
}
