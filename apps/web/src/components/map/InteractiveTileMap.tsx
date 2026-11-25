"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BottomSheet, IconButton, markerSrc } from "@/components/em";
import { Icon } from "@/components/icon/Icon";
import {
  KakaoMapLayer,
  type KakaoMapViewport,
} from "@/components/map/KakaoMapLayer";
import type { EatplPlace, RegionItem, TerritoryOwner } from "@/types/map";

export type MapMode = "restaurants" | "territory";

/** 카카오맵 JS 키가 설정되어 있으면 '식당 보기'에 카카오맵 사용, 미설정/실패 시 OSM 자동 폴백 */
const KAKAO_MAP_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY?.trim() || "";

const TILE_SIZE = 256;
const MIN_ZOOM = 6;
const MAX_ZOOM = 17;
/** 영토 표시 모드에서 시·도 뷰 최대 줌 (이 초과인 zoom 9 이상부터 시·군·구 세부 영토로 전환) */
const PROVINCE_MAX_ZOOM = 8;
const DEFAULT_CENTER = { lat: 36.2, lng: 127.85 };
const NATION_BOUNDS: GeoBounds = {
  minLat: 33.1,
  maxLat: 38.62,
  minLng: 125.0,
  maxLng: 130.95,
};

// SVG 정밀도 유지를 위한 한반도 기준 정규화 좌표 (Web Mercator 0..1)
const REF_NX = (127.85 + 180) / 360;
const REF_NY = latToNormY(36.2);

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

// --- Web Mercator 수학 유틸 ---

function clampLat(lat: number): number {
  return Math.max(32.2, Math.min(39.2, lat));
}

function clampLng(lng: number): number {
  return Math.max(123.8, Math.min(132.4, lng));
}

function latToNormY(lat: number): number {
  const sinLat = Math.sin((lat * Math.PI) / 180);
  const clamped = Math.max(-0.9999, Math.min(0.9999, sinLat));
  return 0.5 - Math.log((1 + clamped) / (1 - clamped)) / (4 * Math.PI);
}

function lngToNormX(lng: number): number {
  return (lng + 180) / 360;
}

function latLngToWorld(
  lat: number,
  lng: number,
  zoom: number,
): { x: number; y: number } {
  const scale = TILE_SIZE * 2 ** zoom;
  return {
    x: lngToNormX(lng) * scale,
    y: latToNormY(lat) * scale,
  };
}

function worldToLatLng(
  x: number,
  y: number,
  zoom: number,
): { lat: number; lng: number } {
  const scale = TILE_SIZE * 2 ** zoom;
  const lng = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return { lat: clampLat(lat), lng: clampLng(lng) };
}

function computeViewportForBounds(
  bounds: GeoBounds,
  width: number,
  height: number,
  minZoom: number,
  maxZoom: number,
): MapViewport {
  const centerLat = (bounds.minLat + bounds.maxLat) / 2;
  const centerLng = (bounds.minLng + bounds.maxLng) / 2;
  const usableW = Math.max(220, width - 140);
  const usableH = Math.max(180, height - 160);

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
          return [lngToNormX(pLng), latToNormY(pLat)];
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
  worldScale: number,
): string {
  const parts: string[] = [];
  for (const ring of rings) {
    if (ring.length < 3) continue;
    let cmd = "";
    for (let i = 0; i < ring.length; i++) {
      const x = ((ring[i][0] - REF_NX) * worldScale).toFixed(1);
      const y = ((ring[i][1] - REF_NY) * worldScale).toFixed(1);
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
  const [hoveredPinId, setHoveredPinId] = useState<string | null>(null);
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);
  const [rankingOpen, setRankingOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [kakaoReady, setKakaoReady] = useState(false);
  const [kakaoFailed, setKakaoFailed] = useState(false);
  const [provinces, setProvinces] = useState<PrecomputedProvince[]>([]);
  const [territories, setTerritories] = useState<PrecomputedTerritory[]>([]);

  const kakaoEnabled = Boolean(KAKAO_MAP_KEY) && !kakaoFailed;
  const kakaoActiveInView = mode === "restaurants" && kakaoEnabled && kakaoReady;

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
        for (const p of meta.provinces) provinceNames.set(p.code, p.name);

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
              name: provinceNames.get(code) ?? feature.properties.name,
              shortName:
                SHORT_PROVINCE_NAME[code] ??
                (provinceNames.get(code) ?? feature.properties.name),
              labelNorm: [lngToNormX(labelLng), latToNormY(labelLat)],
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
            const provinceName = provinceNames.get(parentCode);
            const fullName = provinceName ? `${provinceName} ${name}` : name;
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
                  ? [lngToNormX(lng), latToNormY(lat)]
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
      ),
    [size.width, size.height],
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

      const nx = lngToNormX(lng);
      const ny = latToNormY(lat);
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

    const vp = viewportRef.current;

    const id = requestAnimationFrame(() => {
      setHoveredCode(null);

      if (mode === "territory") {
        // 골목길 수준 과확대 상태였다면 영토 경계가 보이도록 줌 상한만 부드럽게 조정 (중심 좌표는 유지)
        if (vp.zoom > 12) {
          const next = { ...vp, zoom: 12 };
          viewportRef.current = next;
          setViewport(next);
        }
        return;
      }

      // 영토 표시 → 식당 보기: 현재 카메라(위치·줌)는 그대로 유지!
      // 단, 세부 영토(zoom > PROVINCE_MAX_ZOOM)를 보던 중 현재 선택 지역이 화면 밖에 있다면 화면 중심 시·군·구로 목록도 동기화
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
  const fitAll = useCallback(() => {
    setViewport(
      computeFitViewport(places, size.width, size.height, regionCenter),
    );
  }, [places, size.width, size.height, regionCenter]);

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
        const id = requestAnimationFrame(() => setViewport(next));
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
        setViewport((prev) => ({
          lat,
          lng,
          zoom: Math.max(prev.zoom, 14),
        }));
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

  // 마우스 휠·트랙패드 확대/축소 (페이지 스크롤 방지 + 누적 임계값으로 부드러운 1단계 줌)
  // 카카오맵 활성 시에는 카카오맵 네이티브 줌에 맡긴다.
  const wheelAccumRef = useRef(0);
  const wheelLastTriggerRef = useRef(0);
  useEffect(() => {
    const el = containerRef.current;
    if (!el || kakaoActiveInView) return;

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
  }, [handleZoomDelta, kakaoActiveInView]);

  // 영토 표시 모드: zoom <= PROVINCE_MAX_ZOOM(8)은 전국 16개 시·도, 더 확대(zoom >= 9)하면 주변 지역까지 이어진 시·군·구 세부 영토
  const isProvinceLevel =
    mode === "territory" && viewport.zoom <= PROVINCE_MAX_ZOOM;

  const worldScale = TILE_SIZE * 2 ** viewport.zoom;
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
        labelX: (p.labelNorm[0] - REF_NX) * worldScale,
        labelY: (p.labelNorm[1] - REF_NY) * worldScale,
        d: buildTerritoryPathD(p.rings, worldScale),
      }));
    }

    return territories.map((t) => ({
      code: t.code,
      label: t.fullName,
      shortLabel: t.name,
      labelX: t.labelNorm ? (t.labelNorm[0] - REF_NX) * worldScale : null,
      labelY: t.labelNorm ? (t.labelNorm[1] - REF_NY) * worldScale : null,
      d: buildTerritoryPathD(t.rings, worldScale),
    }));
  }, [mode, isProvinceLevel, provinces, territories, worldScale]);

  // 시·군·구 세부 영토에서 시·도 간 경계를 자연스럽게 구분해 주는 외곽선
  const provinceBorderPaths = useMemo(() => {
    if (mode !== "territory" || isProvinceLevel) return [];
    return provinces.map((p) => ({
      code: p.code,
      d: buildTerritoryPathD(p.rings, worldScale),
    }));
  }, [mode, isProvinceLevel, provinces, worldScale]);

  const svgTranslateX = REF_NX * worldScale - centerWorld.x + size.width / 2;
  const svgTranslateY = REF_NY * worldScale - centerWorld.y + size.height / 2;

  // 지도 타일은 '식당 보기' 모드에서 카카오맵이 비활성일 때만 렌더링 (자동 폴백)
  const tiles = useMemo(() => {
    if (mode !== "restaurants" || kakaoActiveInView) return [];
    const halfW = size.width / 2;
    const halfH = size.height / 2;
    const minTileX = Math.floor((centerWorld.x - halfW) / TILE_SIZE) - 1;
    const maxTileX = Math.floor((centerWorld.x + halfW) / TILE_SIZE) + 1;
    const minTileY = Math.floor((centerWorld.y - halfH) / TILE_SIZE) - 1;
    const maxTileY = Math.floor((centerWorld.y + halfH) / TILE_SIZE) + 1;
    const maxIndex = 2 ** viewport.zoom;

    const list: { key: string; url: string; left: number; top: number }[] = [];
    for (let tx = minTileX; tx <= maxTileX; tx++) {
      for (let ty = minTileY; ty <= maxTileY; ty++) {
        if (ty < 0 || ty >= maxIndex) continue;
        const wrappedX = ((tx % maxIndex) + maxIndex) % maxIndex;
        list.push({
          key: `${viewport.zoom}-${tx}-${ty}`,
          url: `https://tile.openstreetmap.org/${viewport.zoom}/${wrappedX}/${ty}.png`,
          left: Math.round(tx * TILE_SIZE - centerWorld.x + halfW),
          top: Math.round(ty * TILE_SIZE - centerWorld.y + halfH),
        });
      }
    }
    return list;
  }, [mode, kakaoActiveInView, centerWorld, size.width, size.height, viewport.zoom]);

  // 식당 핀은 '식당 보기' 모드에서 카카오맵이 비활성일 때만 커스텀 DOM으로 렌더링
  const projectedPins = useMemo(() => {
    if (mode !== "restaurants" || kakaoActiveInView) return [];
    const halfW = size.width / 2;
    const halfH = size.height / 2;

    return places
      .filter(
        (p): p is EatplPlace & { lat: number; lng: number } =>
          p.lat != null && p.lng != null,
      )
      .map((place) => {
        const world = latLngToWorld(place.lat, place.lng, viewport.zoom);
        return {
          place,
          x: world.x - centerWorld.x + halfW,
          y: world.y - centerWorld.y + halfH,
        };
      })
      .filter(
        (pin) =>
          pin.x >= -60 &&
          pin.x <= size.width + 60 &&
          pin.y >= -60 &&
          pin.y <= size.height + 60,
      );
  }, [
    mode,
    kakaoActiveInView,
    places,
    centerWorld,
    size.width,
    size.height,
    viewport.zoom,
  ]);

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
        const nx = lngToNormX(lng);
        const ny = latToNormY(lat);
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

  const handleKakaoFallback = useCallback(() => {
    setKakaoFailed(true);
  }, []);

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
  useEffect(() => {
    if (prevProvinceTriggerRef.current === focusProvinceTrigger) return;
    prevProvinceTriggerRef.current = focusProvinceTrigger;
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
      const nx = lngToNormX(lng);
      const ny = latToNormY(lat);

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
    if (kakaoActiveInView) return;
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

  // 현재 위치 화면 좌표 계산 ('식당 보기' OSM 폴백 모드에서만 표시)
  const projectedUserLocation = useMemo(() => {
    if (mode !== "restaurants" || kakaoActiveInView || !userLocation)
      return null;
    const world = latLngToWorld(
      userLocation.lat,
      userLocation.lng,
      viewport.zoom,
    );
    const x = world.x - centerWorld.x + size.width / 2;
    const y = world.y - centerWorld.y + size.height / 2;
    if (x < -20 || x > size.width + 20 || y < -20 || y > size.height + 20) {
      return null;
    }
    return { x, y };
  }, [
    mode,
    kakaoActiveInView,
    userLocation,
    viewport.zoom,
    centerWorld,
    size.width,
    size.height,
  ]);

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
        (mode === "territory" ? "bg-transparent " : "bg-map-empty/45 ") +
        (kakaoActiveInView ? "" : dragging ? "cursor-grabbing" : "cursor-grab")
      }
    >
      {/* 1층-A: 카카오맵 JS SDK ('식당 보기' 모드 + NEXT_PUBLIC_KAKAO_MAP_KEY 설정 시 자동 활성) */}
      {kakaoEnabled && (
        <KakaoMapLayer
          appKey={KAKAO_MAP_KEY}
          visible={mode === "restaurants"}
          viewport={viewport}
          places={places}
          selectedPlaceId={selectedPlaceId}
          userLocation={userLocation}
          onViewportChange={handleKakaoViewportChange}
          onSelectPlace={onSelectPlace}
          onMapClick={handleKakaoMapClick}
          onReadyChange={setKakaoReady}
          onFallback={handleKakaoFallback}
        />
      )}

      {/* 1층-B: OpenStreetMap 타일 폴백 (카카오맵 키 미설정/로드 실패 시 자동 표시) */}
      {mode === "restaurants" && !kakaoActiveInView && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          {tiles.map((tile) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={tile.key}
              src={tile.url}
              alt=""
              width={TILE_SIZE}
              height={TILE_SIZE}
              draggable={false}
              decoding="async"
              style={{
                position: "absolute",
                left: tile.left,
                top: tile.top,
                width: TILE_SIZE,
                height: TILE_SIZE,
                maxWidth: "none",
              }}
              className="opacity-95 saturate-[0.88]"
            />
          ))}
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
          className="glass-bar pressable absolute top-3.5 left-3.5 z-30 inline-flex h-10 items-center gap-1 rounded-full px-3.5 text-xs font-semibold text-foreground shadow-[inset_0_0_0_1px_var(--color-line)] focus-ring md:top-4 md:left-4"
        >
          <Icon name="back" size={15} className="text-accent-dark" />
          <span>전국</span>
        </button>
      )}

      {/* 3층: 현재 위치 점 + 식당 마커 레이어 ('식당 보기' OSM 폴백 모드에서만 표시) */}
      {mode === "restaurants" && !kakaoActiveInView && (
        <div className="pointer-events-none absolute inset-0 z-20">
          {projectedUserLocation && (
            <div
              aria-label="현재 위치"
              title="현재 위치"
              style={{
                position: "absolute",
                left: projectedUserLocation.x,
                top: projectedUserLocation.y,
                transform: "translate(-50%, -50%)",
              }}
              className="z-10 flex size-7 items-center justify-center rounded-full bg-sky-500/20"
            >
              <span className="size-3.5 rounded-full bg-sky-500 ring-2 ring-surface shadow-sm" />
            </div>
          )}

          {projectedPins.map(({ place, x, y }) => {
            const isSelected = place.id === selectedPlaceId;
            const isHovered = place.id === hoveredPinId;
            const active = isSelected || isHovered;
            const markerWidth = isSelected ? 38 : 30;
            const markerHeight = Math.round((markerWidth * 46) / 36);

            return (
              <div
                key={place.id}
                style={{
                  position: "absolute",
                  left: x,
                  top: y,
                  transform: "translate(-50%, -100%)",
                }}
                className={
                  "pointer-events-auto transition-transform duration-150 " +
                  (isSelected
                    ? "z-30 scale-105"
                    : isHovered
                      ? "z-20 scale-105"
                      : "z-10")
                }
              >
                {active && (
                  <div className="material-thick pointer-events-none absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 rounded-input px-2.5 py-1 whitespace-nowrap">
                    <p className="text-xs font-semibold text-foreground">
                      {place.name}
                    </p>
                    {place.genre && (
                      <p className="text-[11px] text-muted">{place.genre}</p>
                    )}
                  </div>
                )}
                <button
                  type="button"
                  aria-label={`${place.name} 위치 선택`}
                  aria-pressed={isSelected}
                  onMouseEnter={() => setHoveredPinId(place.id)}
                  onMouseLeave={() =>
                    setHoveredPinId((prev) => (prev === place.id ? null : prev))
                  }
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectPlace(place);
                  }}
                  className="block cursor-pointer rounded-full focus-ring"
                >
                  <Image
                    src={markerSrc(isSelected ? "selected" : "restaurant")}
                    alt=""
                    width={markerWidth}
                    height={markerHeight}
                    draggable={false}
                    className="drop-shadow-sm"
                  />
                </button>
              </div>
            );
          })}
        </div>
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

      {/* 우하단 유리 지도 컨트롤 (+, -, 현재 위치) */}
      <div className="pointer-events-none absolute right-4 bottom-8 z-20 flex flex-col gap-2">
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
        {mode === "restaurants" && (
          <IconButton
            icon="locate"
            label={onLocateMe ? "현재 위치로 이동" : "검색 결과 전체 보기"}
            variant="glass"
            className="pointer-events-auto"
            onClick={onLocateMe ?? fitAll}
          />
        )}
      </div>

      {/* 출처 표기 (카카오맵 활성 시 카카오맵 자체 로고가 표시되므로 중복 숨김) */}
      {!kakaoActiveInView && (
        <div className="glass-bar pointer-events-none absolute right-2 bottom-1.5 z-20 rounded px-1.5 py-0.5 text-[10px] text-muted">
          {mode === "territory"
            ? "통계청 SGIS (2026-10-01)"
            : "© OpenStreetMap contributors"}
        </div>
      )}

      {/* 땅따먹기 전체 랭킹 확대 시트 */}
      <BottomSheet
        open={rankingOpen}
        onClose={() => setRankingOpen(false)}
        title={`땅따먹기 랭킹${isSampleOwners ? "(예시)" : ""}`}
      >
        <div className="flex flex-col gap-3.5">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>최근 30일 점령 영토 기준</span>
            <span className="tabular-nums">
              총 {ownersByRegion.size}곳 점령됨
            </span>
          </div>

          <ol className="flex flex-col gap-3">
            {leaderboard.map((entry, idx) => {
              const maxRegions = leaderboard[0]?.regionCount ?? 1;
              const barPercent = Math.max(
                14,
                Math.round((entry.regionCount / maxRegions) * 100),
              );

              return (
                <li
                  key={entry.nickname}
                  className={
                    "flex flex-col gap-2.5 rounded-card p-4 shadow-card " +
                    (idx === 0
                      ? "bg-accent-weak/75 ring-1 ring-accent/50"
                      : "bg-surface")
                  }
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        className={
                          "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums " +
                          (idx === 0
                            ? "bg-accent text-on-accent"
                            : "bg-fill text-foreground")
                        }
                      >
                        {idx + 1}
                      </span>
                      <span
                        aria-hidden="true"
                        style={{ backgroundColor: entry.color }}
                        className="size-3.5 shrink-0 rounded-full"
                      />
                      <span className="truncate text-base font-bold text-foreground">
                        {entry.nickname}
                      </span>
                    </div>
                    <div className="shrink-0 text-right tabular-nums">
                      <span className="text-lg font-bold text-foreground">
                        {entry.regionCount}곳
                      </span>
                      <span className="ml-1.5 text-xs text-muted">
                        리뷰 {entry.totalReviews}
                      </span>
                    </div>
                  </div>

                  {/* 점령 규모 바 */}
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-fill">
                    <div
                      style={{
                        width: `${barPercent}%`,
                        backgroundColor: entry.color,
                      }}
                      className="h-full rounded-full transition-[width] duration-300"
                    />
                  </div>

                  {/* 점령 중인 시·군·구 칩 (클릭 시 해당 지역으로 이동) */}
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {entry.regions.map((r) => (
                      <button
                        key={r.code}
                        type="button"
                        onClick={() => handleSelectRegionFromRanking(r.code)}
                        className="pressable inline-flex h-7 items-center gap-1 rounded-full bg-fill px-2.5 text-xs font-medium text-foreground focus-ring"
                      >
                        <span>{r.name}</span>
                        <span className="text-[11px] text-muted tabular-nums">
                          {r.reviewCount}
                        </span>
                      </button>
                    ))}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </BottomSheet>
    </div>
  );
}
