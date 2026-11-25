"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActionButton, BottomSheet, IconButton } from "@/components/em";
import { Icon } from "@/components/icon/Icon";
import {
  KakaoMapLayer,
  type KakaoMapViewport,
} from "@/components/map/KakaoMapLayer";
import {
  MAX_KAKAO_ZOOM,
  MIN_KAKAO_ZOOM,
  epsg5181ToLatLng,
  latLngToEpsg5181,
  metersPerPixelForZoom,
} from "@/lib/map/epsg5181";
import {
  formatTravelFullName,
  getTravelProvinceName,
} from "@/lib/seo/site";
import type { EatplPlace, RegionItem, TerritoryOwner } from "@/types/map";

export type MapMode = "restaurants" | "territory";

/** '식당 보기' 모드용 카카오맵 JS 키 (미설정 또는 로드 실패 시 오류 안내 표시) */
const KAKAO_MAP_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY?.trim() || "";

const MIN_ZOOM = MIN_KAKAO_ZOOM;
const MAX_ZOOM = MAX_KAKAO_ZOOM;
/** 영토 표시 모드에서 시·도 뷰 최대 줌 (이 초과인 zoom 9 이상부터 시·군·구 세부 영토로 전환) */
const PROVINCE_MAX_ZOOM = 8;
const DEFAULT_CENTER = { lat: 36.2, lng: 127.85 };
const NATION_BOUNDS: GeoBounds = {
  minLat: 33.1,
  maxLat: 38.62,
  minLng: 125.0,
  maxLng: 130.95,
};

// SVG 정밀도 유지를 위한 한반도 기준 원점 (카카오맵 동일 EPSG:5181 평면, x: 동쪽+, y: 남쪽+)
const REF_TM = latLngToEpsg5181(36.2, 127.85);
const REF_X = REF_TM.x;
const REF_Y = -REF_TM.y;

/** 땅따먹기 점령자(닉네임)별 고유 영토 색상 팔레트 (차분한 자연·파스텔 톤) */
const OWNER_PALETTE = [
  "oklch(0.68 0.11 138)", // 세이지 올리브 그린 (1위)
  "oklch(0.76 0.12 75)", // 웜 앰버 (2위)
  "oklch(0.70 0.10 205)", // 소프트 틸 (3위)
  "oklch(0.73 0.12 28)", // 웜 코랄 (4위)
  "oklch(0.70 0.10 265)", // 소프트 블루 (5위)
  "oklch(0.72 0.10 325)", // 더스티 로즈 (6위)
] as const;

const SHORT_PROVINCE_NAME: Record<string, string> = {
  "11": "서울",
  "12": "전남·광주",
  "26": "부산",
  "27": "대구",
  "28": "인천",
  "30": "대전",
  "31": "울산",
  "36": "세종",
  "41": "경기",
  "43": "충북",
  "44": "충남",
  "47": "경북",
  "48": "경남",
  "50": "제주",
  "51": "강원",
  "52": "전북",
};

type MapViewport = {
  lat: number;
  lng: number;
  zoom: number;
};

type RawGeoFeature = {
  properties: {
    code: string;
    name: string;
    parentCode?: string | null;
    labelPoint?: [number, number] | null;
  };
  geometry:
    | { type: "Polygon"; coordinates: [number, number][][] }
    | { type: "MultiPolygon"; coordinates: [number, number][][][] };
};

type RawRegionMeta = {
  provinces: { code: string; name: string }[];
  territories: {
    code: string;
    name: string;
    parentCode?: string;
    labelPoint?: [number, number];
  }[];
};

type GeoBounds = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

type PrecomputedProvince = {
  code: string;
  name: string;
  shortName: string;
  labelNorm: [number, number];
  rings: [number, number][][];
  bounds: GeoBounds;
};

type PrecomputedTerritory = {
  code: string;
  parentCode: string;
  name: string;
  fullName: string;
  centerLat: number | null;
  centerLng: number | null;
  labelNorm: [number, number] | null;
  rings: [number, number][][];
  bounds: GeoBounds;
};

type InteractiveTileMapProps = {
  /** 'restaurants': 실제 도로 지도 + 식당 핀 / 'territory': 배경선 없는 깔끔한 영토 캔버스 */
  mode: MapMode;
  places: EatplPlace[];
  selectedPlaceId: string | null;
  onSelectPlace: (place: EatplPlace) => void;
  regionCenter?: { lat: number; lng: number } | null;
  userLocation?: { lat: number; lng: number } | null;
  onLocateMe?: () => void;
  /** 지역·음식 검색이 새로 완료될 때마다 증가하는 키 */
  fitTrigger: number;
  /** 최근 30일 공유 영토 주인 맵 (regionCode → TerritoryOwner) */
  ownersByRegion: ReadonlyMap<string, TerritoryOwner>;
  isSampleOwners?: boolean;
  selectedRegionCode: string | null;
  onSelectRegion: (region: RegionItem) => void;
  /** 왼쪽 지역 목록에서 시·도를 골랐을 때 지도 카메라를 맞추기 위한 대상 시·도 코드 (null이면 전국) */
  focusProvinceCode?: string | null;
  /** 시·도 포커스 요청마다 증가하는 키 */
  focusProvinceTrigger?: number;
  /** 영토 지도에서 시·도를 클릭했을 때 왼쪽 목록과 동기화하는 콜백 */
  onSelectProvince?: (provinceCode: string) => void;
};

// --- 카카오맵 동일 EPSG:5181 (중부원점 TM) 평면 투영 유틸 ---

function clampLat(lat: number): number {
  return Math.max(32.2, Math.min(39.2, lat));
}

function clampLng(lng: number): number {
  return Math.max(123.8, Math.min(132.4, lng));
}

/** 위도·경도 → EPSG:5181 평면 좌표(미터, x: 동쪽+, y: 남쪽+ 화면 방향) */
function latLngToTmScreenMeters(lat: number, lng: number): [number, number] {
  const tm = latLngToEpsg5181(lat, lng);
  return [tm.x, -tm.y];
}

function latLngToWorld(
  lat: number,
  lng: number,
  zoom: number,
): { x: number; y: number } {
  const mpp = metersPerPixelForZoom(zoom);
  const tm = latLngToEpsg5181(lat, lng);
  return {
    x: tm.x / mpp,
    y: -tm.y / mpp,
  };
}

function worldToLatLng(
  x: number,
  y: number,
  zoom: number,
): { lat: number; lng: number } {
  const mpp = metersPerPixelForZoom(zoom);
  const { lat, lng } = epsg5181ToLatLng(x * mpp, -y * mpp);
  return { lat: clampLat(lat), lng: clampLng(lng) };
}

function computeViewportForBounds(
  bounds: GeoBounds,
  width: number,
  height: number,
  minZoom: number,
  maxZoom: number,
  /** true면 영토(SVG) 전용 지도라 소수 줌으로 프레임에 꽉 맞춘다. 카카오 지도는 정수 레벨만 쓴다. */
  fractional = false,
): MapViewport {
  const centerLat = (bounds.minLat + bounds.maxLat) / 2;
  const centerLng = (bounds.minLng + bounds.maxLng) / 2;
  const usableW = Math.max(220, width - (fractional ? 48 : 140));
  const usableH = Math.max(180, height - (fractional ? 72 : 160));

  if (fractional) {
    const nw0 = latLngToWorld(bounds.maxLat, bounds.minLng, minZoom);
    const se0 = latLngToWorld(bounds.minLat, bounds.maxLng, minZoom);
    const scale = Math.min(
      usableW / Math.abs(se0.x - nw0.x),
      usableH / Math.abs(se0.y - nw0.y),
    );
    const zoom = Math.max(minZoom, Math.min(maxZoom + 1, minZoom + Math.log2(scale)));
    return { lat: centerLat, lng: centerLng, zoom };
  }

  for (let z = maxZoom; z >= minZoom; z--) {
    const nw = latLngToWorld(bounds.maxLat, bounds.minLng, z);
    const se = latLngToWorld(bounds.minLat, bounds.maxLng, z);
    if (
      Math.abs(se.x - nw.x) <= usableW &&
      Math.abs(se.y - nw.y) <= usableH
    ) {
      return { lat: centerLat, lng: centerLng, zoom: z };
    }
  }
  return { lat: centerLat, lng: centerLng, zoom: minZoom };
}

function computeFitViewport(
  places: EatplPlace[],
  width: number,
  height: number,
  regionCenter?: { lat: number; lng: number } | null,
): MapViewport {
  const geoPlaces = places.filter(
    (p): p is EatplPlace & { lat: number; lng: number } =>
      p.lat != null && p.lng != null,
  );

  if (geoPlaces.length === 0) {
    if (regionCenter) {
      return { lat: regionCenter.lat, lng: regionCenter.lng, zoom: 12 };
    }
    return { ...DEFAULT_CENTER, zoom: 7 };
  }

  if (geoPlaces.length === 1) {
    return { lat: geoPlaces[0].lat, lng: geoPlaces[0].lng, zoom: 15 };
  }

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  for (const p of geoPlaces) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  }

  return computeViewportForBounds(
    { minLat, maxLat, minLng, maxLng },
    width,
    height,
    MIN_ZOOM,
    16,
  );
}

function extractRingsAndBounds(geometry: RawGeoFeature["geometry"]): {
  rings: [number, number][][];
  bounds: GeoBounds;
} {
  const polygons =
    geometry.type === "Polygon"
      ? [geometry.coordinates]
      : geometry.coordinates;

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  const rings: [number, number][][] = [];
  for (const poly of polygons) {
    for (const ring of poly) {
      rings.push(
        ring.map(([pLng, pLat]) => {
          if (pLat < minLat) minLat = pLat;
          if (pLat > maxLat) maxLat = pLat;
          if (pLng < minLng) minLng = pLng;
          if (pLng > maxLng) maxLng = pLng;
          return latLngToTmScreenMeters(pLat, pLng);
        }),
      );
    }
  }

  return {
    rings,
    bounds: { minLat, maxLat, minLng, maxLng },
  };
}

function pointInRing(
  px: number,
  py: number,
  ring: [number, number][],
): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersect =
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / (yj - yi + Number.EPSILON) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInRings(
  nx: number,
  ny: number,
  rings: [number, number][][],
): boolean {
  let count = 0;
  for (const ring of rings) {
    if (pointInRing(nx, ny, ring)) count += 1;
  }
  return count % 2 === 1;
}

function buildTerritoryPathD(
  rings: [number, number][][],
  pxPerMeter: number,
): string {
  const parts: string[] = [];
  for (const ring of rings) {
    if (ring.length < 3) continue;
    let cmd = "";
    for (let i = 0; i < ring.length; i++) {
      const x = ((ring[i][0] - REF_X) * pxPerMeter).toFixed(1);
      const y = ((ring[i][1] - REF_Y) * pxPerMeter).toFixed(1);
      cmd += (i === 0 ? "M" : "L") + x + "," + y;
    }
    parts.push(cmd + "Z");
  }
  return parts.join("");
}

/**
 * 식당 보기 / 영토 표시 듀얼 모드 지도
 * - 식당 보기('restaurants'): 영토 경계 없이 깨끗한 도로 지도 타일 + 식당 핀 + 현재 위치
 * - 영토 표시('territory'): 도로·지명 선 없이 깨끗한 캔버스 위에 영토 폴리곤만 표시
 *   (전국 16개 시·도 → 시·도 클릭 시 해당 시·도의 시·군·구만 깔끔하게 확대 포커스 + 하얀 말풍선 + 땅따먹기 랭킹 시트)
 */
export function InteractiveTileMap({
  mode,
  places,
  selectedPlaceId,
  onSelectPlace,
  regionCenter,
  userLocation = null,
  onLocateMe,
  fitTrigger,
  ownersByRegion,
  isSampleOwners = false,
  selectedRegionCode,
  onSelectRegion,
  focusProvinceCode = null,
  focusProvinceTrigger = 0,
  onSelectProvince,
}: InteractiveTileMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 900, height: 640 });
  const [viewport, setViewport] = useState<MapViewport>(() =>
    computeFitViewport(places, 900, 640, regionCenter),
  );
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);
  const [expandedRank, setExpandedRank] = useState<string | null>(null);
  const [rankingOpen, setRankingOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [kakaoReady, setKakaoReady] = useState(false);
  const [kakaoError, setKakaoError] = useState<string | null>(() =>
    KAKAO_MAP_KEY
      ? null
      : "카카오맵 API 키(NEXT_PUBLIC_KAKAO_MAP_KEY)가 설정되지 않았어요.",
  );
  const [kakaoRetryKey, setKakaoRetryKey] = useState(0);
  const [provinces, setProvinces] = useState<PrecomputedProvince[]>([]);
  const [territories, setTerritories] = useState<PrecomputedTerritory[]>([]);

  const kakaoEnabled = Boolean(KAKAO_MAP_KEY) && !kakaoError;
  const isTerritoryMode = mode === "territory";

  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originWorldX: number;
    originWorldY: number;
    clickedCode: string | null;
    moved: boolean;
    captured: boolean;
  } | null>(null);

  // 정밀 source-resolution 시·도(16개) + 시·군·구(230개) GeoJSON 최초 1회 로드
  useEffect(() => {
    const controller = new AbortController();

    const loadGeo = async (primary: string, fallback: string) => {
      const res = await fetch(primary, { signal: controller.signal });
      if (res.ok) return (await res.json()) as { features: RawGeoFeature[] };
      const fb = await fetch(fallback, { signal: controller.signal });
      if (!fb.ok) throw new Error(String(fb.status));
      return (await fb.json()) as { features: RawGeoFeature[] };
    };

    Promise.all([
      loadGeo(
        "/images/maps/geojson/sido.geojson",
        "/images/maps/geojson/sido.preview.geojson",
      ),
      loadGeo(
        "/images/maps/geojson/territories.geojson",
        "/images/maps/geojson/territories.preview.geojson",
      ),
      fetch("/images/maps/region-codes.json", {
        signal: controller.signal,
      }).then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json() as Promise<RawRegionMeta>;
      }),
    ])
      .then(([sidoGeo, territoryGeo, meta]) => {
        const provinceNames = new Map<string, string>();
        for (const p of meta.provinces) {
          provinceNames.set(p.code, getTravelProvinceName(p.code, p.name));
        }

        const metaByCode = new Map<
          string,
          { parentCode?: string; labelPoint?: [number, number] }
        >();
        for (const t of meta.territories) {
          metaByCode.set(t.code, {
            parentCode: t.parentCode,
            labelPoint: t.labelPoint,
          });
        }

        const nextProvinces: PrecomputedProvince[] = sidoGeo.features.map(
          (feature) => {
            const code = feature.properties.code;
            const { rings, bounds } = extractRingsAndBounds(feature.geometry);
            const lp = feature.properties.labelPoint;
            const labelLng = lp ? lp[0] : (bounds.minLng + bounds.maxLng) / 2;
            const labelLat = lp ? lp[1] : (bounds.minLat + bounds.maxLat) / 2;

            return {
              code,
              name:
                provinceNames.get(code) ??
                getTravelProvinceName(code, feature.properties.name),
              shortName:
                SHORT_PROVINCE_NAME[code] ??
                provinceNames.get(code) ??
                feature.properties.name,
              labelNorm: latLngToTmScreenMeters(labelLat, labelLng),
              rings,
              bounds,
            };
          },
        );

        const nextTerritories: PrecomputedTerritory[] =
          territoryGeo.features.map((feature) => {
            const { code, name } = feature.properties;
            const info = metaByCode.get(code);
            const parentCode =
              feature.properties.parentCode ??
              info?.parentCode ??
              code.slice(0, 2);
            const fullName = formatTravelFullName(parentCode, name);
            const lp = feature.properties.labelPoint ?? info?.labelPoint;
            const [lng, lat] = lp ?? [null, null];
            const { rings, bounds } = extractRingsAndBounds(feature.geometry);

            return {
              code,
              parentCode,
              name,
              fullName,
              centerLat: lat,
              centerLng: lng,
              labelNorm:
                lng != null && lat != null
                  ? latLngToTmScreenMeters(lat, lng)
                  : null,
              rings,
              bounds,
            };
          });

        setProvinces(nextProvinces);
        setTerritories(nextTerritories);
      })
      .catch(() => {
        // 경계 파일 로드 실패 시 기본 지도 유지
      });

    return () => controller.abort();
  }, []);

  const provinceByCode = useMemo(() => {
    const map = new Map<string, PrecomputedProvince>();
    for (const p of provinces) map.set(p.code, p);
    return map;
  }, [provinces]);

  const territoryByCode = useMemo(() => {
    const map = new Map<string, PrecomputedTerritory>();
    for (const t of territories) map.set(t.code, t);
    return map;
  }, [territories]);

  // 전국 땅따먹기 랭킹 & 점령자별 고유 색상 + 점령 지역 목록 집계
  const { leaderboard, colorByOwner } = useMemo(() => {
    const stats = new Map<
      string,
      {
        nickname: string;
        regionCount: number;
        totalReviews: number;
        regions: { code: string; name: string; fullName: string; reviewCount: number }[];
      }
    >();

    for (const owner of ownersByRegion.values()) {
      const entry = stats.get(owner.ownerNickname) ?? {
        nickname: owner.ownerNickname,
        regionCount: 0,
        totalReviews: 0,
        regions: [],
      };
      const t = territoryByCode.get(owner.regionCode);
      entry.regionCount += 1;
      entry.totalReviews += owner.reviewCount;
      entry.regions.push({
        code: owner.regionCode,
        name: t?.name ?? owner.regionCode,
        fullName: t?.fullName ?? owner.regionCode,
        reviewCount: owner.reviewCount,
      });
      stats.set(owner.ownerNickname, entry);
    }

    const sorted = [...stats.values()].sort(
      (a, b) =>
        b.regionCount - a.regionCount || b.totalReviews - a.totalReviews,
    );

    const colorMap = new Map<string, string>();
    sorted.forEach((entry, idx) => {
      colorMap.set(entry.nickname, OWNER_PALETTE[idx % OWNER_PALETTE.length]);
    });

    return {
      leaderboard: sorted.map((entry) => ({
        ...entry,
        color: colorMap.get(entry.nickname) ?? OWNER_PALETTE[0],
      })),
      colorByOwner: colorMap,
    };
  }, [ownersByRegion, territoryByCode]);

  // 시·도별 점령 현황 및 최다 점령자(시·도 1등) 집계
  const provinceLeadership = useMemo(() => {
    const map = new Map<
      string,
      {
        total: number;
        claimed: number;
        topOwner: string | null;
        topOwnerCount: number;
        topOwnerReviews: number;
      }
    >();

    const perProvinceOwner = new Map<
      string,
      Map<string, { count: number; reviews: number }>
    >();

    for (const t of territories) {
      const entry = map.get(t.parentCode) ?? {
        total: 0,
        claimed: 0,
        topOwner: null,
        topOwnerCount: 0,
        topOwnerReviews: 0,
      };
      entry.total += 1;

      const owner = ownersByRegion.get(t.code);
      if (owner) {
        entry.claimed += 1;
        const ownerMap =
          perProvinceOwner.get(t.parentCode) ??
          new Map<string, { count: number; reviews: number }>();
        const oStat = ownerMap.get(owner.ownerNickname) ?? {
          count: 0,
          reviews: 0,
        };
        oStat.count += 1;
        oStat.reviews += owner.reviewCount;
        ownerMap.set(owner.ownerNickname, oStat);
        perProvinceOwner.set(t.parentCode, ownerMap);
      }

      map.set(t.parentCode, entry);
    }

    for (const [pCode, ownerMap] of perProvinceOwner.entries()) {
      const entry = map.get(pCode);
      if (!entry) continue;
      let bestName: string | null = null;
      let bestCount = 0;
      let bestReviews = 0;
      for (const [name, st] of ownerMap.entries()) {
        if (
          st.count > bestCount ||
          (st.count === bestCount && st.reviews > bestReviews)
        ) {
          bestName = name;
          bestCount = st.count;
          bestReviews = st.reviews;
        }
      }
      entry.topOwner = bestName;
      entry.topOwnerCount = bestCount;
      entry.topOwnerReviews = bestReviews;
    }

    return map;
  }, [territories, ownersByRegion]);

  // 컨테이너 크기 추적
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setSize({ width: rect.width, height: rect.height });
      }
    };
    update();

    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const viewportRef = useRef(viewport);
  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  const skipNextFitRef = useRef(false);

  const computeNationViewport = useCallback(
    () =>
      computeViewportForBounds(
        NATION_BOUNDS,
        size.width,
        size.height,
        MIN_ZOOM,
        7,
        isTerritoryMode,
      ),
    [size.width, size.height, isTerritoryMode],
  );

  const findTerritoryAtLatLng = useCallback(
    (
      lat: number,
      lng: number,
      provinceCodeFilter?: string | null,
      exactOnly = false,
    ): PrecomputedTerritory | null => {
      const candidates = provinceCodeFilter
        ? territories.filter((t) => t.parentCode === provinceCodeFilter)
        : territories;
      if (candidates.length === 0) return null;

      const [nx, ny] = latLngToTmScreenMeters(lat, lng);
      for (const t of candidates) {
        if (
          lat < t.bounds.minLat ||
          lat > t.bounds.maxLat ||
          lng < t.bounds.minLng ||
          lng > t.bounds.maxLng
        ) {
          continue;
        }
        if (pointInRings(nx, ny, t.rings)) return t;
      }

      if (exactOnly) return null;

      // 바다·경계 바깥이면 중심 좌표가 가장 가까운 시·군·구 반환
      const cosLat = Math.cos((lat * Math.PI) / 180);
      let best: PrecomputedTerritory | null = null;
      let bestDistSq = Infinity;
      for (const t of candidates) {
        if (t.centerLat == null || t.centerLng == null) continue;
        const dLat = t.centerLat - lat;
        const dLng = (t.centerLng - lng) * cosLat;
        const distSq = dLat * dLat + dLng * dLng;
        if (distSq < bestDistSq) {
          bestDistSq = distSq;
          best = t;
        }
      }
      return best;
    },
    [territories],
  );

  // '식당 보기' 모드에서 지도를 드래그·확대해 다른 시·군·구로 이동했을 때 카메라 점프 없이 지역·식당 자동 동기화
  const syncRegionToViewport = useCallback(
    (vp: MapViewport) => {
      if (mode !== "restaurants" || vp.zoom <= PROVINCE_MAX_ZOOM) return;
      const hit = findTerritoryAtLatLng(vp.lat, vp.lng, null, true);
      if (!hit || hit.code === selectedRegionCode) return;

      skipNextFitRef.current = true;
      onSelectRegion({
        code: hit.code,
        name: hit.name,
        fullName: hit.fullName,
        centerLat: hit.centerLat,
        centerLng: hit.centerLng,
      });
    },
    [mode, selectedRegionCode, findTerritoryAtLatLng, onSelectRegion],
  );

  // 모드 전환 시 현재 지도 위치·줌을 그대로 동기화
  const prevModeRef = useRef<MapMode>(mode);
  useEffect(() => {
    if (prevModeRef.current === mode) return;
    prevModeRef.current = mode;

    const id = requestAnimationFrame(() => {
      const vp = viewportRef.current;
      setHoveredCode(null);

      if (mode === "territory") {
        // 초근접 골목길 수준(zoom 14+)이었다면 시·군·구 경계가 보이도록 줌 상한만 부드럽게 조정 (중심 좌표는 유지)
        if (vp.zoom > 13) {
          const next = { ...vp, zoom: 13 };
          viewportRef.current = next;
          setViewport(next);
        }
        return;
      }

      // 영토 표시 → 식당 보기: 현재 카메라(위치·줌)는 그대로 유지하고,
      // 세부 영토(zoom > PROVINCE_MAX_ZOOM)에서 선택 지역이 화면 밖에 있으면 화면 중심 시·군·구로 왼쪽 목록 동기화
      if (vp.zoom > PROVINCE_MAX_ZOOM) {
        const selectedTarget = selectedRegionCode
          ? territoryByCode.get(selectedRegionCode)
          : undefined;
        let selectedInView = false;
        if (
          selectedTarget?.centerLat != null &&
          selectedTarget?.centerLng != null
        ) {
          const cWorld = latLngToWorld(vp.lat, vp.lng, vp.zoom);
          const tWorld = latLngToWorld(
            selectedTarget.centerLat,
            selectedTarget.centerLng,
            vp.zoom,
          );
          selectedInView =
            Math.abs(tWorld.x - cWorld.x) <= size.width / 2 &&
            Math.abs(tWorld.y - cWorld.y) <= size.height / 2;
        }

        if (!selectedInView) {
          const centerTerritory = findTerritoryAtLatLng(vp.lat, vp.lng);
          if (centerTerritory) {
            skipNextFitRef.current = true;
            onSelectRegion({
              code: centerTerritory.code,
              name: centerTerritory.name,
              fullName: centerTerritory.fullName,
              centerLat: centerTerritory.centerLat,
              centerLng: centerTerritory.centerLng,
            });
          }
        }
      }
    });
    return () => cancelAnimationFrame(id);
  }, [
    mode,
    selectedRegionCode,
    size.width,
    size.height,
    territoryByCode,
    findTerritoryAtLatLng,
    onSelectRegion,
  ]);

  // 식당 보기 모드에서 검색 결과 변경 시 핀이 모두 보이도록 카메라 맞추기
  const prevFitRef = useRef(fitTrigger);
  useEffect(() => {
    if (prevFitRef.current !== fitTrigger) {
      prevFitRef.current = fitTrigger;
      if (skipNextFitRef.current) {
        skipNextFitRef.current = false;
        return;
      }
      if (mode === "restaurants") {
        const next = computeFitViewport(
          places,
          size.width,
          size.height,
          regionCenter,
        );
        const id = requestAnimationFrame(() => {
          viewportRef.current = next;
          setViewport(next);
        });
        return () => cancelAnimationFrame(id);
      }
      if (mode === "territory" && selectedRegionCode) {
        const target = territoryByCode.get(selectedRegionCode);
        const province = target
          ? provinceByCode.get(target.parentCode)
          : undefined;
        if (target && province) {
          const vp = viewportRef.current;
          // 이미 세부 영토를 보고 있고 선택한 지역이 화면 안에 있다면 카메라를 튀기지 않고 유지
          let targetInView = false;
          if (
            vp.zoom > PROVINCE_MAX_ZOOM &&
            target.centerLat != null &&
            target.centerLng != null
          ) {
            const cWorld = latLngToWorld(vp.lat, vp.lng, vp.zoom);
            const tWorld = latLngToWorld(
              target.centerLat,
              target.centerLng,
              vp.zoom,
            );
            targetInView =
              Math.abs(tWorld.x - cWorld.x) <= size.width * 0.45 &&
              Math.abs(tWorld.y - cWorld.y) <= size.height * 0.45;
          }

          if (!targetInView) {
            const next = computeViewportForBounds(
              province.bounds,
              size.width,
              size.height,
              PROVINCE_MAX_ZOOM + 1,
              12,
            );
            const id = requestAnimationFrame(() => {
              viewportRef.current = next;
              setHoveredCode(null);
              setViewport(next);
            });
            return () => cancelAnimationFrame(id);
          }
        }
      }
    }
  }, [
    fitTrigger,
    mode,
    places,
    size.width,
    size.height,
    regionCenter,
    selectedRegionCode,
    territoryByCode,
    provinceByCode,
  ]);

  // 리스트에서 식당을 골랐을 때 해당 핀으로 이동
  const prevSelectedRef = useRef<string | null>(null);
  useEffect(() => {
    if (
      mode !== "restaurants" ||
      !selectedPlaceId ||
      prevSelectedRef.current === selectedPlaceId
    ) {
      return;
    }
    prevSelectedRef.current = selectedPlaceId;
    const target = places.find((p) => p.id === selectedPlaceId);
    if (target?.lat != null && target?.lng != null) {
      const lat = target.lat;
      const lng = target.lng;
      const id = requestAnimationFrame(() => {
        const next: MapViewport = {
          lat,
          lng,
          zoom: Math.max(viewportRef.current.zoom, 14),
        };
        viewportRef.current = next;
        setViewport(next);
      });
      return () => cancelAnimationFrame(id);
    }
  }, [mode, selectedPlaceId, places]);

  const handleZoomDelta = useCallback(
    (delta: number, focalPoint?: { x: number; y: number }) => {
      const prev = viewportRef.current;
      const nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev.zoom + delta));
      if (nextZoom === prev.zoom) return;

      // 커서 좌표(또는 화면 중앙) 기준으로 부드럽게 확대·축소 (카메라 점프 없이 자연스럽게 시·도 ↔ 시·군·구 전환)
      const fx = focalPoint ? focalPoint.x : size.width / 2;
      const fy = focalPoint ? focalPoint.y : size.height / 2;
      const beforeWorld = latLngToWorld(prev.lat, prev.lng, prev.zoom);
      const focalWorldX = beforeWorld.x + (fx - size.width / 2);
      const focalWorldY = beforeWorld.y + (fy - size.height / 2);

      const scaleFactor = 2 ** (nextZoom - prev.zoom);
      const nextCenterWorldX =
        focalWorldX * scaleFactor - (fx - size.width / 2);
      const nextCenterWorldY =
        focalWorldY * scaleFactor - (fy - size.height / 2);
      const nextCenter = worldToLatLng(
        nextCenterWorldX,
        nextCenterWorldY,
        nextZoom,
      );

      const nextViewport: MapViewport = {
        lat: nextCenter.lat,
        lng: nextCenter.lng,
        zoom: nextZoom,
      };

      // 시·도 ↔ 시·군·구 경계를 넘나들 때 이전 레벨의 호버 상태만 정리
      if (
        mode === "territory" &&
        prev.zoom <= PROVINCE_MAX_ZOOM !== nextZoom <= PROVINCE_MAX_ZOOM
      ) {
        setHoveredCode(null);
      }

      viewportRef.current = nextViewport;
      setViewport(nextViewport);
      syncRegionToViewport(nextViewport);
    },
    [mode, size.width, size.height, syncRegionToViewport],
  );

  // 마우스 휠·트랙패드 확대/축소 ('영토 표시' SVG 모드에서만 사용, '식당 보기'는 카카오맵 네이티브 줌 사용)
  const wheelAccumRef = useRef(0);
  const wheelLastTriggerRef = useRef(0);
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !isTerritoryMode) return;

    const handleWheel = (event: WheelEvent) => {
      if ((event.target as Element | null)?.closest("dialog")) return;
      event.preventDefault();

      if (event.deltaY === 0) return;

      const now = performance.now();
      // 방향이 바뀌었거나 잠시 멈췄으면 누적 초기화
      if (
        Math.sign(wheelAccumRef.current) !== Math.sign(event.deltaY) ||
        now - wheelLastTriggerRef.current > 240
      ) {
        wheelAccumRef.current = 0;
      }

      wheelAccumRef.current += event.deltaY;
      if (Math.abs(wheelAccumRef.current) < 30) return;
      if (now - wheelLastTriggerRef.current < 90) return;

      const delta = wheelAccumRef.current < 0 ? 1 : -1;
      wheelAccumRef.current = 0;
      wheelLastTriggerRef.current = now;

      const rect = el.getBoundingClientRect();
      handleZoomDelta(delta, {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleZoomDelta, isTerritoryMode]);

  // 영토 표시 모드: zoom <= PROVINCE_MAX_ZOOM(8)은 전국 16개 시·도, 더 확대(zoom >= 9)하면 주변 지역까지 이어진 시·군·구 세부 영토
  const isProvinceLevel =
    mode === "territory" && viewport.zoom <= PROVINCE_MAX_ZOOM;

  const pxPerMeter = 1 / metersPerPixelForZoom(viewport.zoom);
  const centerWorld = useMemo(
    () => latLngToWorld(viewport.lat, viewport.lng, viewport.zoom),
    [viewport],
  );

  // 영토 표시 모드 폴리곤 계산 (zoom 9 이상에서는 옆 시·도의 시·군·구까지 끊김 없이 함께 표시)
  const activeOverlayPaths = useMemo(() => {
    if (mode !== "territory") return [];

    if (isProvinceLevel) {
      return provinces.map((p) => ({
        code: p.code,
        label: p.name,
        shortLabel: p.shortName,
        labelX: (p.labelNorm[0] - REF_X) * pxPerMeter,
        labelY: (p.labelNorm[1] - REF_Y) * pxPerMeter,
        d: buildTerritoryPathD(p.rings, pxPerMeter),
      }));
    }

    return territories.map((t) => ({
      code: t.code,
      label: t.fullName,
      shortLabel: t.name,
      labelX: t.labelNorm ? (t.labelNorm[0] - REF_X) * pxPerMeter : null,
      labelY: t.labelNorm ? (t.labelNorm[1] - REF_Y) * pxPerMeter : null,
      d: buildTerritoryPathD(t.rings, pxPerMeter),
    }));
  }, [mode, isProvinceLevel, provinces, territories, pxPerMeter]);

  // 시·군·구 세부 영토에서 시·도 간 경계를 자연스럽게 구분해 주는 외곽선
  const provinceBorderPaths = useMemo(() => {
    if (mode !== "territory" || isProvinceLevel) return [];
    return provinces.map((p) => ({
      code: p.code,
      d: buildTerritoryPathD(p.rings, pxPerMeter),
    }));
  }, [mode, isProvinceLevel, provinces, pxPerMeter]);

  const svgTranslateX = REF_X * pxPerMeter - centerWorld.x + size.width / 2;
  const svgTranslateY = REF_Y * pxPerMeter - centerWorld.y + size.height / 2;

  const handleKakaoViewportChange = useCallback(
    (next: KakaoMapViewport) => {
      viewportRef.current = next;
      setViewport(next);
      syncRegionToViewport(next);
    },
    [syncRegionToViewport],
  );

  const handleKakaoMapClick = useCallback(
    (lat: number, lng: number) => {
      // 전국/광역 줌(<= 8)에서는 시·도 단위 1단계 확대 → 이후 클릭 시 시·군·구 선택
      if (viewportRef.current.zoom <= PROVINCE_MAX_ZOOM) {
        const [nx, ny] = latLngToTmScreenMeters(lat, lng);
        const hitProvince = provinces.find(
          (p) =>
            lat >= p.bounds.minLat &&
            lat <= p.bounds.maxLat &&
            lng >= p.bounds.minLng &&
            lng <= p.bounds.maxLng &&
            pointInRings(nx, ny, p.rings),
        );
        const pCode =
          hitProvince?.code ?? findTerritoryAtLatLng(lat, lng)?.parentCode;
        if (pCode) {
          const province = provinceByCode.get(pCode);
          if (province) {
            const next = computeViewportForBounds(
              province.bounds,
              size.width,
              size.height,
              PROVINCE_MAX_ZOOM + 1,
              12,
            );
            viewportRef.current = next;
            setHoveredCode(null);
            setViewport(next);
          }
          onSelectProvince?.(pCode);
        }
        return;
      }

      const target = findTerritoryAtLatLng(lat, lng);
      if (!target) return;
      onSelectRegion({
        code: target.code,
        name: target.name,
        fullName: target.fullName,
        centerLat: target.centerLat,
        centerLng: target.centerLng,
      });
    },
    [
      provinces,
      provinceByCode,
      size.width,
      size.height,
      findTerritoryAtLatLng,
      onSelectProvince,
      onSelectRegion,
    ],
  );

  const handleKakaoError = useCallback((message: string) => {
    setKakaoError(message);
  }, []);

  const handleRetryKakao = () => {
    if (!KAKAO_MAP_KEY) return;
    setKakaoError(null);
    setKakaoReady(false);
    setKakaoRetryKey((n) => n + 1);
  };

  const backToNation = useCallback(() => {
    const nationVp = computeNationViewport();
    viewportRef.current = nationVp;
    setHoveredCode(null);
    setViewport(nationVp);
  }, [computeNationViewport]);

  const focusProvince = useCallback(
    (provinceCode: string) => {
      const province = provinceByCode.get(provinceCode);
      if (!province) return;
      const next = computeViewportForBounds(
        province.bounds,
        size.width,
        size.height,
        PROVINCE_MAX_ZOOM + 1,
        12,
      );
      viewportRef.current = next;
      setHoveredCode(null);
      setViewport(next);
    },
    [provinceByCode, size.width, size.height],
  );

  const handlePolygonClick = useCallback(
    (code: string) => {
      // 1단계: 전국/광역 뷰(zoom <= 8)에서 지도 클릭 → 도/특별시/광역시로 확대
      if (
        viewportRef.current.zoom <= PROVINCE_MAX_ZOOM &&
        provinceByCode.has(code)
      ) {
        focusProvince(code);
        onSelectProvince?.(code);
        return;
      }

      // 2단계: 시·도 확대 뷰(zoom >= 9)에서 지도 클릭 → 해당 시·군·구 선택 및 한 단계 더 확대
      const target = territoryByCode.get(code);
      if (!target) return;
      if (mode === "territory") {
        const next = computeViewportForBounds(
          target.bounds,
          size.width,
          size.height,
          Math.max(viewportRef.current.zoom, PROVINCE_MAX_ZOOM + 2),
          12,
        );
        viewportRef.current = next;
        setViewport(next);
      }
      onSelectRegion({
        code: target.code,
        name: target.name,
        fullName: target.fullName,
        centerLat: target.centerLat,
        centerLng: target.centerLng,
      });
    },
    [
      mode,
      provinceByCode,
      size.width,
      size.height,
      focusProvince,
      onSelectProvince,
      territoryByCode,
      onSelectRegion,
    ],
  );

  // 왼쪽 목록에서 시·도 또는 '전국'을 골랐을 때 오른쪽 지도도 함께 이동
  const prevProvinceTriggerRef = useRef(focusProvinceTrigger);
  const initialProvinceFocusedRef = useRef(false);
  useEffect(() => {
    if (
      !initialProvinceFocusedRef.current &&
      focusProvinceCode &&
      !selectedRegionCode &&
      provinces.length > 0
    ) {
      initialProvinceFocusedRef.current = true;
      const id = requestAnimationFrame(() => {
        focusProvince(focusProvinceCode);
      });
      return () => cancelAnimationFrame(id);
    }
  }, [focusProvinceCode, selectedRegionCode, provinces.length, focusProvince]);

  useEffect(() => {
    if (prevProvinceTriggerRef.current === focusProvinceTrigger) return;
    prevProvinceTriggerRef.current = focusProvinceTrigger;
    initialProvinceFocusedRef.current = true;
    const id = requestAnimationFrame(() => {
      if (focusProvinceCode) {
        focusProvince(focusProvinceCode);
      } else {
        backToNation();
      }
    });
    return () => cancelAnimationFrame(id);
  }, [focusProvinceTrigger, focusProvinceCode, focusProvince, backToNation]);

  const findCodeAtClientPoint = useCallback(
    (clientX: number, clientY: number): string | null => {
      const el = containerRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const worldX = centerWorld.x + (clientX - rect.left - size.width / 2);
      const worldY = centerWorld.y + (clientY - rect.top - size.height / 2);
      const { lat, lng } = worldToLatLng(worldX, worldY, viewport.zoom);
      const [nx, ny] = latLngToTmScreenMeters(lat, lng);

      // 어느 모드든 전국/광역 줌(<= 8)에서는 시·도 단위로 먼저 판정 (도 → 시·군·구 단계별 확대)
      if (viewport.zoom <= PROVINCE_MAX_ZOOM) {
        for (const p of provinces) {
          if (
            lat < p.bounds.minLat ||
            lat > p.bounds.maxLat ||
            lng < p.bounds.minLng ||
            lng > p.bounds.maxLng
          ) {
            continue;
          }
          if (pointInRings(nx, ny, p.rings)) return p.code;
        }
        return null;
      }

      for (const t of territories) {
        if (
          lat < t.bounds.minLat ||
          lat > t.bounds.maxLat ||
          lng < t.bounds.minLng ||
          lng > t.bounds.maxLng
        ) {
          continue;
        }
        if (pointInRings(nx, ny, t.rings)) return t.code;
      }
      return null;
    },
    [
      centerWorld.x,
      centerWorld.y,
      size.width,
      size.height,
      viewport.zoom,
      provinces,
      territories,
    ],
  );

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isTerritoryMode) return;
    if ((event.target as HTMLElement).closest("button, a, dialog")) return;
    const regionPath = (event.target as Element).closest("[data-region-code]");
    const clickedCode = regionPath?.getAttribute("data-region-code") ?? null;

    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originWorldX: centerWorld.x,
      originWorldY: centerWorld.y,
      clickedCode,
      moved: false,
      captured: false,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = dragStateRef.current;
    if (!state || state.pointerId !== event.pointerId) return;

    const dx = event.clientX - state.startX;
    const dy = event.clientY - state.startY;
    if (!state.moved && Math.hypot(dx, dy) > 5) {
      state.moved = true;
      setDragging(true);
      if (!state.captured) {
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
          state.captured = true;
        } catch {
          // 무시
        }
      }
    }

    if (!state.moved) return;

    const next = worldToLatLng(
      state.originWorldX - dx,
      state.originWorldY - dy,
      viewport.zoom,
    );
    viewportRef.current = {
      ...viewportRef.current,
      lat: next.lat,
      lng: next.lng,
    };
    setViewport((prev) => ({ ...prev, lat: next.lat, lng: next.lng }));
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = dragStateRef.current;
    if (!state || state.pointerId !== event.pointerId) return;
    dragStateRef.current = null;
    setDragging(false);

    if (state.captured) {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // 무시
      }
    }

    if (state.moved) {
      syncRegionToViewport(viewportRef.current);
      return;
    }

    const code =
      state.clickedCode ??
      findCodeAtClientPoint(event.clientX, event.clientY);
    if (code) {
      handlePolygonClick(code);
    }
  };

  const handlePointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = dragStateRef.current;
    if (!state || state.pointerId !== event.pointerId) return;
    dragStateRef.current = null;
    setDragging(false);
  };

  // 영토 표시 모드에서 호버/선택된 지역 위에 띄울 하얀 말풍선 위치 계산
  const floatingBubble = useMemo(() => {
    if (mode !== "territory") return null;
    const targetCode =
      hoveredCode ?? (!isProvinceLevel ? selectedRegionCode : null);
    if (!targetCode) return null;

    const item = activeOverlayPaths.find((p) => p.code === targetCode);
    if (!item || item.labelX == null || item.labelY == null) return null;

    const screenX = item.labelX + svgTranslateX;
    const screenY = item.labelY + svgTranslateY;
    if (
      screenX < 20 ||
      screenX > size.width - 20 ||
      screenY < 40 ||
      screenY > size.height - 20
    ) {
      return null;
    }

    if (isProvinceLevel) {
      const lead = provinceLeadership.get(targetCode);
      return {
        title: item.label,
        subtitle: lead?.topOwner ?? null,
        x: screenX,
        y: screenY,
      };
    }

    const owner = ownersByRegion.get(targetCode);
    return {
      title: item.shortLabel,
      subtitle: owner?.ownerNickname ?? null,
      x: screenX,
      y: screenY,
    };
  }, [
    mode,
    hoveredCode,
    isProvinceLevel,
    selectedRegionCode,
    activeOverlayPaths,
    svgTranslateX,
    svgTranslateY,
    size.width,
    size.height,
    provinceLeadership,
    ownersByRegion,
  ]);

  const handleSelectRegionFromRanking = (code: string) => {
    const target = territoryByCode.get(code);
    if (!target) return;
    setRankingOpen(false);
    if (mode === "territory") {
      focusProvince(target.parentCode);
    }
    onSelectRegion({
      code: target.code,
      name: target.name,
      fullName: target.fullName,
      centerLat: target.centerLat,
      centerLng: target.centerLng,
    });
  };

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label={mode === "territory" ? "공유 영토 지도" : "식당 지도"}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      className={
        "relative size-full touch-none select-none overflow-hidden transition-colors duration-200 " +
        (isTerritoryMode ? "bg-transparent " : "bg-map-empty/45 ") +
        (isTerritoryMode ? (dragging ? "cursor-grabbing" : "cursor-grab") : "")
      }
    >
      {/* 1층: 카카오맵 JS SDK ('식당 보기' 전용) */}
      {kakaoEnabled && (
        <KakaoMapLayer
          appKey={KAKAO_MAP_KEY}
          retryKey={kakaoRetryKey}
          visible={mode === "restaurants"}
          viewport={viewport}
          places={places}
          selectedPlaceId={selectedPlaceId}
          userLocation={userLocation}
          onViewportChange={handleKakaoViewportChange}
          onSelectPlace={onSelectPlace}
          onMapClick={handleKakaoMapClick}
          onReadyChange={setKakaoReady}
          onError={handleKakaoError}
        />
      )}

      {/* 카카오맵 로딩 중 안내 */}
      {mode === "restaurants" && kakaoEnabled && !kakaoReady && (
        <div
          role="status"
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-surface/60 px-6 text-center backdrop-blur-[2px]"
        >
          <Icon name="map" size={26} className="text-accent-dark/70" />
          <p className="text-sm font-medium text-foreground">
            카카오맵을 불러오고 있어요…
          </p>
        </div>
      )}

      {/* 카카오맵 로드 실패 또는 API 키 미설정 시 안내 */}
      {mode === "restaurants" && kakaoError && (
        <div
          role="alert"
          className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-surface/90 px-6 text-center"
        >
          <div className="flex max-w-sm flex-col items-center gap-3 rounded-card border border-line bg-surface p-6 shadow-card">
            <span className="flex size-11 items-center justify-center rounded-full bg-fill text-muted">
              <Icon name="map" size={22} />
            </span>
            <div className="space-y-1">
              <p className="text-base font-semibold text-foreground">
                카카오맵을 불러오지 못했어요
              </p>
              <p className="text-xs leading-relaxed break-keep text-muted">
                {kakaoError}
              </p>
            </div>
            {KAKAO_MAP_KEY && (
              <ActionButton
                variant="tinted"
                size="sm"
                onClick={handleRetryKakao}
              >
                다시 시도
              </ActionButton>
            )}
          </div>
        </div>
      )}

      {/* 2층: 배경선 없는 깔끔한 영토 캔버스 ('영토 표시' 모드에서만 표시) */}
      {mode === "territory" && activeOverlayPaths.length > 0 && (
        <svg
          width={size.width}
          height={size.height}
          aria-label={
            isProvinceLevel ? "전국 시·도 영토 지도" : "시·군·구 영토 지도"
          }
          className="absolute inset-0 z-10 overflow-hidden"
        >
          <g transform={`translate(${svgTranslateX}, ${svgTranslateY})`}>
            {activeOverlayPaths.map((item) => {
              const isHovered = hoveredCode === item.code;
              const isSelected = !isProvinceLevel && selectedRegionCode === item.code;

              let ownerColor: string | undefined;
              if (isProvinceLevel) {
                const lead = provinceLeadership.get(item.code);
                ownerColor = lead?.topOwner
                  ? colorByOwner.get(lead.topOwner)
                  : undefined;
              } else {
                const owner = ownersByRegion.get(item.code);
                ownerColor = owner
                  ? colorByOwner.get(owner.ownerNickname)
                  : undefined;
              }

              const fillOpacity = ownerColor
                ? isSelected || isHovered
                  ? 0.85
                  : 0.62
                : isSelected || isHovered
                  ? 1
                  : 0.92;

              return (
                <path
                  key={item.code}
                  data-region-code={item.code}
                  d={item.d}
                  fillRule="evenodd"
                  style={ownerColor ? { fill: ownerColor } : undefined}
                  fillOpacity={fillOpacity}
                  strokeWidth={
                    isSelected
                      ? 2
                      : isHovered
                        ? 1.5
                        : isProvinceLevel
                          ? 1.1
                          : 0.9
                  }
                  strokeOpacity={
                    isSelected || isHovered
                      ? 1
                      : isProvinceLevel
                        ? 0.95
                        : 0.75
                  }
                  strokeLinejoin="round"
                  onMouseEnter={() => setHoveredCode(item.code)}
                  onMouseLeave={() =>
                    setHoveredCode((prev) =>
                      prev === item.code ? null : prev,
                    )
                  }
                  className={
                    `${
                      ownerColor
                        ? ""
                        : isSelected || isHovered
                          ? "fill-map-partial"
                          : "fill-map-empty"
                    } ${
                      isSelected ? "stroke-accent-dark" : "stroke-map-line"
                    } cursor-pointer transition-[fill,fill-opacity] duration-150`
                  }
                />
              );
            })}

            {/* 시·군·구 세부 영토일 때 시·도 외곽 경계를 한 단계 또렷하게 표시 */}
            {provinceBorderPaths.map((p) => (
              <path
                key={`border-${p.code}`}
                d={p.d}
                fill="none"
                strokeWidth={1.6}
                strokeOpacity={1}
                strokeLinejoin="round"
                className="pointer-events-none stroke-map-line"
              />
            ))}
          </g>
        </svg>
      )}

      {/* 영토 표시 모드: 호버/선택 지역 위 깔끔한 하얀 말풍선 */}
      {mode === "territory" && floatingBubble && (
        <div
          style={{
            left: floatingBubble.x,
            top: floatingBubble.y,
            transform: "translate(-50%, -115%)",
          }}
          className="pointer-events-none absolute z-20 rounded-xl bg-surface px-3 py-1.5 text-center shadow-float ring-1 ring-line"
        >
          <p className="text-xs font-semibold whitespace-nowrap text-foreground">
            {floatingBubble.title}
          </p>
          {floatingBubble.subtitle && (
            <p className="mt-0.5 text-[11px] font-medium whitespace-nowrap text-accent-dark">
              {floatingBubble.subtitle}
            </p>
          )}
        </div>
      )}

      {/* 영토 표시 모드: 세부 영토(시·군·구) 진입 시 '← 전국' 복귀 버튼 */}
      {mode === "territory" && !isProvinceLevel && (
        <button
          type="button"
          onClick={backToNation}
          className="glass-bar pressable absolute top-2.5 left-2.5 z-30 inline-flex h-9 items-center gap-1 rounded-full px-2.5 text-xs font-semibold text-foreground shadow-[inset_0_0_0_1px_var(--color-line)] focus-ring sm:top-4 sm:left-4 sm:h-10 sm:px-3.5"
        >
          <Icon name="back" size={14} className="text-accent-dark sm:size-[15px]" />
          <span>전국</span>
        </button>
      )}

      {/* 좌하단 클릭 가능한 땅따먹기 TOP 3 카드 (클릭 시 전체 랭킹 시트 크게 열림) */}
      {mode === "territory" && leaderboard.length > 0 && (
        <button
          type="button"
          onClick={() => setRankingOpen(true)}
          aria-label="땅따먹기 전체 랭킹 보기"
          className="glass-bar pressable absolute bottom-3 left-3 z-20 flex flex-col gap-1.5 rounded-card px-3.5 py-2.5 text-left text-[11px] shadow-[inset_0_0_0_1px_var(--color-line)] focus-ring"
        >
          <div className="flex items-center justify-between gap-4">
            <span className="inline-flex items-center gap-1 font-semibold text-foreground">
              <Icon name="trophy" size={13} className="text-accent-dark" />
              <span>땅따먹기 TOP 3{isSampleOwners ? "(예시)" : ""}</span>
            </span>
            <Icon name="chevron-right" size={13} className="text-muted" />
          </div>
          <ol className="flex flex-col gap-1">
            {leaderboard.slice(0, 3).map((entry, idx) => (
              <li
                key={entry.nickname}
                className="flex items-center justify-between gap-4"
              >
                <span className="inline-flex items-center gap-1.5 text-foreground">
                  <span
                    aria-hidden="true"
                    style={{ backgroundColor: entry.color }}
                    className="size-2.5 shrink-0 rounded-full"
                  />
                  <span className="font-medium text-muted tabular-nums">
                    {idx + 1}.
                  </span>
                  <span className="max-w-28 truncate font-medium">
                    {entry.nickname}
                  </span>
                </span>
                <span className="font-semibold text-foreground tabular-nums">
                  {entry.regionCount}곳
                </span>
              </li>
            ))}
          </ol>
        </button>
      )}

      {/* 우하단 유리 지도 컨트롤 (+, -) */}
      {(isTerritoryMode || kakaoReady) && (
        <div className="pointer-events-none absolute right-3 bottom-7 z-20 flex flex-col gap-2 sm:right-4 sm:bottom-8">
          <IconButton
            icon="plus"
            label="지도 확대"
            variant="glass"
            className="pointer-events-auto"
            onClick={() => handleZoomDelta(1)}
          />
          <IconButton
            icon="minus"
            label="지도 축소"
            variant="glass"
            className="pointer-events-auto"
            onClick={() => handleZoomDelta(-1)}
          />
          {mode === "restaurants" && onLocateMe && (
            <IconButton
              icon="locate"
              label="현재 위치로 이동"
              variant="glass"
              className="pointer-events-auto"
              onClick={onLocateMe}
            />
          )}
        </div>
      )}

      {/* 영토 지도 출처 표기 ('식당 보기'에서는 카카오맵 자체 로고가 표시됨) */}
      {isTerritoryMode && (
        <div className="glass-bar pointer-events-none absolute right-2 bottom-1.5 z-20 rounded px-1.5 py-0.5 text-[10px] text-muted">
          통계청 SGIS (2026-10-01) · krmap · admdongkor (CC BY 4.0)
        </div>
      )}

      {/* 땅따먹기 전체 랭킹 확대 시트 */}
      <BottomSheet
        open={rankingOpen}
        onClose={() => setRankingOpen(false)}
        title={`땅따먹기 랭킹${isSampleOwners ? "(예시)" : ""}`}
      >
        <div className="flex flex-col gap-2">
          <p className="type-caption text-muted">
            최근 30일 점령 영토 기준, 총 {ownersByRegion.size}곳
          </p>

          <ol className="list-group">
            {leaderboard.map((entry, idx) => {
              const open = expandedRank === entry.nickname;
              return (
                <li key={entry.nickname}>
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setExpandedRank(open ? null : entry.nickname)}
                    className="pressable flex min-h-14 w-full items-center gap-3 px-1 text-left focus-ring"
                  >
                    <span className="w-5 shrink-0 text-center type-row font-semibold tabular-nums text-foreground">
                      {idx + 1}
                    </span>
                    <span
                      aria-hidden="true"
                      style={{ backgroundColor: entry.color }}
                      className="size-3 shrink-0 rounded-full"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate type-row">{entry.nickname}</span>
                      <span className="block type-caption font-normal text-muted tabular-nums">
                        후기 {entry.totalReviews}개
                      </span>
                    </span>
                    <span className="type-row font-semibold tabular-nums">{entry.regionCount}곳</span>
                    <Icon
                      name="chevron-right"
                      size={18}
                      className={"shrink-0 text-muted " + (open ? "rotate-90" : "")}
                    />
                  </button>
                  {open && (
                    <ul className="flex flex-wrap gap-2 pt-1 pr-1 pb-3 pl-9">
                      {entry.regions.map((r) => (
                        <li key={r.code}>
                          <button
                            type="button"
                            onClick={() => handleSelectRegionFromRanking(r.code)}
                            className="pressable inline-flex h-9 items-center gap-1.5 rounded-full bg-fill px-3 type-caption text-foreground focus-ring"
                          >
                            {r.name}
                            <span className="text-muted tabular-nums">{r.reviewCount}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </BottomSheet>
    </div>
  );
}
