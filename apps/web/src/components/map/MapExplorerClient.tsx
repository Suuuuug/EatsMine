"use client";

import { useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FilterChip, useToast } from "@/components/em";
import { Icon } from "@/components/icon/Icon";
import {
  InteractiveTileMap,
  type MapMode,
} from "@/components/map/InteractiveTileMap";
import { RestaurantReviewSheet } from "@/components/map/RestaurantReviewSheet";
import { sortRegions, validEatplUrl } from "@/lib/map/home-contract";
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
import type { EatplPlace, RegionItem, TerritoryOwner } from "@/types/map";

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
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const searchBoxRef = useRef<HTMLDivElement>(null);

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

  // 검색창 바깥 클릭 시 자동완성 닫기
  useEffect(() => {
    if (!suggestionsOpen) return;
    const handleOutside = (event: MouseEvent) => {
      if (
        searchBoxRef.current &&
        !searchBoxRef.current.contains(event.target as Node)
      ) {
        setSuggestionsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [suggestionsOpen]);

  // 공유 영토 땅따먹기 주인 맵 (예시 데이터 — 백엔드 연동 시 GET /territories로 교체)
  const ownersByRegion = useMemo(() => {
    const map = new Map<string, TerritoryOwner>();
    for (const owner of MOCK_TERRITORY_OWNERS) {
      map.set(owner.regionCode, owner);
    }
    return map;
  }, []);

  // 현재 조건에 맞는 예시 식당 검색 결과
  // TODO(api): 백엔드 연동 시 이 지점에서 NEXT_PUBLIC_API_URL과 /?preview=1 분기를 연결한다.
  // - 실제 모드: home-contract의 buildRestaurantUrl(apiBase, selectedRegion.code, foodId)로 GET /restaurants 호출,
  //   HTTP 401/403/502/503 오류 상태 안내 UI를 표시하고 후기 집계는 formatReviewSummary, 외부 링크는 validEatplUrl(원본 그대로, 쿼리 추가 금지)을 재사용한다.
  // - 예시 모드(/?preview=1 또는 API 미설정): 아래 buildMockSearchResult 결과를 표시한다.
  const result = useMemo(() => {
    if (!selectedRegion) return null;
    return buildMockSearchResult(selectedRegion, {
      genres: selectedGenres,
      foodLabel: activeFood?.name ?? null,
    });
  }, [selectedRegion, selectedGenres, activeFood]);

  const places = result?.items ?? [];
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
        setSuggestionsOpen(false);
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
    setSuggestionsOpen(false);
    setRegionQuery("");
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
    showToast("리뷰를 남겼어요(예시)");
  };

  const visibleGenres = useMemo(() => {
    if (!showAllGenres) return [...QUICK_GENRES];
    return [
      ...new Set([...QUICK_GENRES, ...MOCK_GENRES.major, ...MOCK_GENRES.minor]),
    ];
  }, [showAllGenres]);

  return (
    <main className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-5 pt-5 pb-8 md:px-8 lg:grid lg:h-dvh lg:grid-cols-[minmax(320px,388px)_minmax(0,1fr)] lg:gap-7 lg:overflow-hidden lg:py-6">
      {/* 왼쪽: EatsMine 에디토리얼 탐색·식당 목록 컬럼 */}
      <aside
        id="map-list-panel"
        aria-label="지역 및 맛집 탐색"
        className="order-2 flex min-h-0 min-w-0 flex-col gap-4 lg:order-1"
      >
        {/* 뒤로가기 브레드크럼 + 큰 제목 + 땅 주인 */}
        <header className="flex flex-col gap-1">
          {(selectedRegion || browsingProvince) && (
            <button
              type="button"
              onClick={handleBackStep}
              className="pressable -ml-2 inline-flex min-h-9 w-fit items-center gap-0.5 rounded-input px-2 text-sm font-semibold text-accent-dark focus-ring"
            >
              <Icon name="back" size={16} />
              <span>
                {selectedRegion &&
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
                  : "전국"}
              </span>
            </button>
          )}

          <div className="flex items-start justify-between gap-2">
            <h1 className="type-title min-w-0 break-keep text-foreground">
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
              <span className="type-caption shrink-0 pt-1.5 font-medium text-muted tabular-nums">
                {places.length}곳
              </span>
            ) : browsingProvince ? (
              <span className="type-caption shrink-0 pt-1.5 font-medium text-muted tabular-nums">
                {districtsOfBrowsingProvince.length}곳
              </span>
            ) : null}
          </div>

          {selectedRegion && (currentOwner || selectedGenres.length > 0) && (
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
              {currentOwner && (
                <p className="type-caption mr-1 text-muted">
                  땅 주인{" "}
                  <span className="font-semibold text-foreground">
                    {currentOwner.ownerNickname}
                  </span>{" "}
                  · 리뷰 {currentOwner.reviewCount}(예시)
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
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <div ref={searchBoxRef} className="relative min-w-0 flex-1">
              <form
                role="search"
                onSubmit={(event) => {
                  event.preventDefault();
                  const picked = regionSuggestions[suggestionIndex];
                  if (picked) handleSelectRegion(picked);
                }}
                className="flex h-11 w-full items-center gap-2 rounded-input border border-line bg-surface/75 px-3 transition-colors focus-within:bg-surface focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent"
              >
                <Icon
                  name="search"
                  size={16}
                  className="shrink-0 text-muted"
                />
                <input
                  type="search"
                  value={regionQuery}
                  onChange={(event) => {
                    const next = event.target.value;
                    setRegionQuery(next);
                    setSuggestionIndex(0);
                    setSuggestionsOpen(Boolean(next.trim()));
                  }}
                  onFocus={() => {
                    if (regionQuery.trim()) setSuggestionsOpen(true);
                  }}
                  onKeyDown={(event) => {
                    if (!suggestionsOpen || regionSuggestions.length === 0)
                      return;
                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      setSuggestionIndex(
                        (prev) => (prev + 1) % regionSuggestions.length,
                      );
                    } else if (event.key === "ArrowUp") {
                      event.preventDefault();
                      setSuggestionIndex(
                        (prev) =>
                          (prev - 1 + regionSuggestions.length) %
                          regionSuggestions.length,
                      );
                    } else if (event.key === "Escape") {
                      setSuggestionsOpen(false);
                    }
                  }}
                  aria-label="여행 지역 검색"
                  placeholder="여행 지역 검색"
                  enterKeyHint="search"
                  className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted/80 [&::-webkit-search-cancel-button]:hidden"
                />
                {regionQuery && (
                  <button
                    type="button"
                    aria-label="검색어 지우기"
                    onClick={() => {
                      setRegionQuery("");
                      setSuggestionsOpen(false);
                    }}
                    className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted hover:text-foreground focus-ring"
                  >
                    <Icon name="close" size={14} />
                  </button>
                )}
              </form>

              {/* 자동완성 결과 드롭다운 */}
              {suggestionsOpen && regionQuery.trim() && (
                <div
                  role="listbox"
                  aria-label="지역 검색 결과"
                  className="material-thick absolute inset-x-0 top-full z-40 mt-1.5 max-h-64 overflow-y-auto rounded-input p-1"
                >
                  {regionSuggestions.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-muted">
                      일치하는 시·군·구가 없어요.
                    </p>
                  ) : (
                    regionSuggestions.map((region, idx) => (
                      <button
                        key={region.code}
                        type="button"
                        role="option"
                        aria-selected={idx === suggestionIndex}
                        onMouseEnter={() => setSuggestionIndex(idx)}
                        onClick={() => handleSelectRegion(region)}
                        className={
                          "flex min-h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-[7px] px-3 py-2 text-left text-sm transition-colors " +
                          (idx === suggestionIndex
                            ? "bg-accent-weak font-medium text-foreground"
                            : "text-foreground hover:bg-fill")
                        }
                      >
                        <span className="inline-flex items-center gap-2 truncate">
                          <Icon
                            name="pin"
                            size={14}
                            className="shrink-0 text-accent-dark"
                          />
                          <span className="truncate">{region.fullName}</span>
                        </span>
                        <span className="shrink-0 text-xs text-muted">
                          선택
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

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
        <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
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
          ) : (
            <ul aria-label="식당 목록(예시)" className="divide-y divide-line">
              {places.map((place) => {
                const isSelected = place.id === selectedPlaceId;
                const reviewSummary = getSamplePlaceReviews(
                  place,
                  localReviewsByPlace[place.id],
                );
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
                      {/* 상단 가로: 컴팩트 이미지 슬롯 + 식당명 · 주소 · 업종 · 매출/영업시간 */}
                      <div className="flex items-start gap-3">
                        <div
                          aria-hidden="true"
                          className="flex h-20 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-fill"
                        >
                          {place.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={place.imageUrl}
                              alt=""
                              className="size-full object-cover"
                            />
                          ) : (
                            <Icon
                              name="restaurant"
                              size={22}
                              className="text-muted/35"
                            />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <h2 className="truncate text-[15px] font-semibold tracking-tight text-foreground">
                              {place.name}
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

                      {/* 중단: 평점 · 대표 후기(최대 2줄) */}
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openReviewSheet(place);
                        }}
                        className="pressable block w-full rounded-input px-1 py-1 text-left focus-ring"
                      >
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-foreground tabular-nums">
                          <Icon
                            name="star"
                            size={12}
                            className="shrink-0 text-star"
                          />
                          <span>
                            {reviewSummary.averageRating.toFixed(1)} · 후기{" "}
                            {reviewSummary.reviewCount}개
                            {reviewSummary.isSample ? "(예시)" : ""}
                          </span>
                        </span>
                        <span className="mt-0.5 block line-clamp-2 text-xs leading-relaxed text-muted">
                          {reviewSummary.featuredReview.content}
                        </span>
                      </button>

                      {/* 하단 액션 줄: 후기 보기 · 잇플 상세 보기 */}
                      <div className="flex items-center justify-between gap-3 px-1">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openReviewSheet(place);
                          }}
                          className="pressable inline-flex min-h-8 items-center gap-0.5 rounded-input text-xs font-semibold text-accent-dark underline underline-offset-4 focus-ring"
                        >
                          <span>후기 보기</span>
                          <span aria-hidden="true">›</span>
                        </button>

                        {safeEatplUrl ? (
                          <a
                            href={safeEatplUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedPlaceId(place.id);
                            }}
                            className="pressable inline-flex min-h-8 items-center gap-1 rounded-input text-xs font-semibold text-accent-dark focus-ring"
                          >
                            <span>잇플 상세 보기</span>
                            <Icon name="external" size={13} />
                          </a>
                        ) : (
                          <span
                            aria-disabled="true"
                            title="백엔드 API 연동 후 실제 잇플 상세 페이지로 연결돼요"
                            className="inline-flex min-h-8 cursor-not-allowed items-center gap-1 text-xs font-medium text-muted/75"
                          >
                            <span>잇플 상세 보기(예시)</span>
                          </span>
                        )}
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>
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
        className="relative order-1 h-[48vh] min-h-[340px] w-full overflow-hidden rounded-card border border-line bg-surface/45 shadow-card lg:order-2 lg:h-full"
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
          isSampleOwners
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
