"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icon/Icon";
import { sortRegions } from "@/lib/map/home-contract";
import {
  getTravelProvinceName,
  sortProvincesByTravelName,
} from "@/lib/seo/site";

/*
 * 영토 지도(나의 방문 현황 표시용 정밀 SVG).
 * 홈 영토 지도와 동일한 최신 통계청 SGIS(2026-10-01) 정밀 경계(sido.geojson / territories.geojson)를 사용한다.
 * - 전국 16개 시·도 → 시·도를 고르면 해당 시·도의 시·군·구 230곳 상세 표시
 * - 키보드·화면 읽기는 아래 지역 버튼 목록으로 조작한다.
 * - 칠한 영토(visited)는 부모가 넘긴다. 이 부품은 저장하지 않는다.
 */

type Region = { code: string; name: string; parentCode?: string };
type RegionMeta = {
  sourceDate: string;
  provinces: Region[];
  territories: Region[];
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

type ProjectedPath = {
  code: string;
  name: string;
  d: string;
  labelX: number;
  labelY: number;
};

type ProjectedShape = {
  viewBox: string;
  width: number;
  height: number;
  minX: number;
  minY: number;
  paths: ProjectedPath[];
};

const BASE = "/images/maps";
const NATION = "";

function latToMercY(lat: number): number {
  const sinLat = Math.sin((lat * Math.PI) / 180);
  const clamped = Math.max(-0.9999, Math.min(0.9999, sinLat));
  return 0.5 - Math.log((1 + clamped) / (1 - clamped)) / (4 * Math.PI);
}

function lngToMercX(lng: number): number {
  return (lng + 180) / 360;
}

function buildProjectedShape(
  features: RawGeoFeature[],
  nameOverride?: ReadonlyMap<string, string>,
): ProjectedShape | null {
  if (features.length === 0) return null;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  const converted = features.map((feature) => {
    const polygons =
      feature.geometry.type === "Polygon"
        ? [feature.geometry.coordinates]
        : feature.geometry.coordinates;

    let fMinX = Infinity;
    let fMaxX = -Infinity;
    let fMinY = Infinity;
    let fMaxY = -Infinity;

    const rings = polygons.flatMap((poly) =>
      poly.map((ring) =>
        ring.map(([lng, lat]) => {
          const x = lngToMercX(lng);
          const y = latToMercY(lat);
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          if (x < fMinX) fMinX = x;
          if (x > fMaxX) fMaxX = x;
          if (y < fMinY) fMinY = y;
          if (y > fMaxY) fMaxY = y;
          return [x, y] as [number, number];
        }),
      ),
    );

    const lp = feature.properties.labelPoint;
    const labelX = lp ? lngToMercX(lp[0]) : (fMinX + fMaxX) / 2;
    const labelY = lp ? latToMercY(lp[1]) : (fMinY + fMaxY) / 2;

    return {
      code: feature.properties.code,
      name:
        nameOverride?.get(feature.properties.code) ?? feature.properties.name,
      rings,
      labelX,
      labelY,
    };
  });

  const rawW = Math.max(1e-6, maxX - minX);
  const rawH = Math.max(1e-6, maxY - minY);
  const scale = 1000 / Math.max(rawW, rawH);
  const pad = 28;
  const vbW = rawW * scale + pad * 2;
  const vbH = rawH * scale + pad * 2;

  const toX = (x: number) => (x - minX) * scale + pad;
  const toY = (y: number) => (y - minY) * scale + pad;

  const paths: ProjectedPath[] = converted.map((item) => {
    const parts: string[] = [];
    for (const ring of item.rings) {
      if (ring.length < 3) continue;
      let cmd = "";
      for (let i = 0; i < ring.length; i++) {
        cmd +=
          (i === 0 ? "M" : "L") +
          toX(ring[i][0]).toFixed(1) +
          "," +
          toY(ring[i][1]).toFixed(1);
      }
      parts.push(cmd + "Z");
    }
    return {
      code: item.code,
      name: item.name,
      d: parts.join(""),
      labelX: toX(item.labelX),
      labelY: toY(item.labelY),
    };
  });

  return {
    viewBox: `0 0 ${vbW.toFixed(1)} ${vbH.toFixed(1)}`,
    width: vbW,
    height: vbH,
    minX: 0,
    minY: 0,
    paths,
  };
}

type TerritoryMapProps = {
  /** 칠한 영토 코드(5자리 SGIS 코드). 시도 코드가 아니다. */
  visited: readonly string[];
  /** 영토 하나를 골랐을 때 */
  onSelectTerritory?: (territory: { code: string; name: string }) => void;
  className?: string;
};

export function TerritoryMap({
  visited,
  onSelectTerritory,
  className = "",
}: TerritoryMapProps) {
  const [meta, setMeta] = useState<RegionMeta | null>(null);
  const [sidoFeatures, setSidoFeatures] = useState<RawGeoFeature[]>([]);
  const [territoryFeatures, setTerritoryFeatures] = useState<RawGeoFeature[]>(
    [],
  );
  const [loadError, setLoadError] = useState(false);
  const [province, setProvince] = useState(NATION);
  const [selected, setSelected] = useState("");
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  const movedByUser = useRef(false);

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
      fetch(`${BASE}/region-codes.json`, { signal: controller.signal }).then(
        (res) => {
          if (!res.ok) throw new Error(String(res.status));
          return res.json() as Promise<RegionMeta>;
        },
      ),
      loadGeo(
        `${BASE}/geojson/sido.geojson`,
        `${BASE}/geojson/sido.preview.geojson`,
      ),
      loadGeo(
        `${BASE}/geojson/territories.geojson`,
        `${BASE}/geojson/territories.preview.geojson`,
      ),
    ])
      .then(([regionMeta, sidoGeo, territoryGeo]) => {
        setMeta(regionMeta);
        setSidoFeatures(sidoGeo.features);
        setTerritoryFeatures(territoryGeo.features);
        setLoadError(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoadError(true);
      });

    return () => controller.abort();
  }, [attempt]);

  // 시도를 바꾼 뒤 키보드 사용자가 길을 잃지 않게 제목으로 포커스를 옮긴다.
  useEffect(() => {
    if (movedByUser.current) headingRef.current?.focus();
  }, [province]);

  const owned = useMemo(() => new Set(visited), [visited]);
  const territoriesOf = useMemo(() => {
    const map = new Map<string, Region[]>();
    for (const t of meta?.territories ?? []) {
      const parent = t.parentCode ?? t.code.slice(0, 2);
      const list = map.get(parent) ?? [];
      list.push(t);
      map.set(parent, list);
    }
    return map;
  }, [meta]);

  const provinceNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of meta?.provinces ?? []) {
      map.set(p.code, getTravelProvinceName(p.code, p.name));
    }
    return map;
  }, [meta]);

  const provinceName = province ? provinceNameMap.get(province) : undefined;
  const regions = useMemo(() => {
    if (!meta) return [];
    if (province === NATION) {
      return sortProvincesByTravelName(meta.provinces);
    }
    return sortRegions(territoriesOf.get(province) ?? []);
  }, [meta, province, territoriesOf]);

  // 현재 레벨(전국 16개 시·도 또는 선택한 시·도의 시·군·구)에 맞춘 정밀 SVG 투영
  const shape = useMemo(() => {
    if (province === NATION) {
      return buildProjectedShape(sidoFeatures, provinceNameMap);
    }
    const filtered = territoryFeatures.filter(
      (f) =>
        (f.properties.parentCode ?? f.properties.code.slice(0, 2)) === province,
    );
    return buildProjectedShape(filtered);
  }, [province, sidoFeatures, territoryFeatures, provinceNameMap]);

  function ratioOf(code: string) {
    if (province !== NATION) return owned.has(code) ? 1 : 0;
    const list = territoriesOf.get(code) ?? [];
    if (list.length === 0) return 0;
    return list.filter((t) => owned.has(t.code)).length / list.length;
  }

  function choose(code: string, name: string) {
    setHoveredCode(null);
    if (province === NATION) {
      movedByUser.current = true;
      setSelected("");
      setProvince(code);
    } else {
      setSelected(code);
      onSelectTerritory?.({ code, name });
    }
  }

  function backToNation() {
    movedByUser.current = true;
    setHoveredCode(null);
    setSelected("");
    setProvince(NATION);
  }

  const loading = !loadError && (!meta || !shape);
  const bubbleCode = hoveredCode ?? (province !== NATION ? selected : null);
  const bubblePath =
    bubbleCode && shape
      ? (shape.paths.find((p) => p.code === bubbleCode) ?? null)
      : null;

  return (
    <section
      aria-labelledby={titleId}
      className={`flex flex-col gap-4 ${className}`}
    >
      <div className="flex min-h-11 items-center gap-1">
        {province !== NATION && (
          <button
            type="button"
            onClick={backToNation}
            className="pressable -ml-2 inline-flex h-11 items-center gap-1 rounded-button pr-3 pl-1.5 type-body font-medium text-accent-dark"
          >
            <Icon name="back" size={20} />
            전국
          </button>
        )}
        <h3
          id={titleId}
          ref={headingRef}
          tabIndex={-1}
          className="type-section outline-none"
        >
          {provinceName ?? "전국"}
        </h3>
      </div>

      <div className="relative flex aspect-[4/5] max-h-[min(65vh,560px)] w-full items-center justify-center overflow-hidden rounded-card border border-line bg-surface/45 p-4">
        {loadError ? (
          <div
            role="alert"
            className="flex h-full flex-col items-center justify-center gap-3 text-center"
          >
            <p className="type-body">지도를 불러오지 못했어요.</p>
            <button
              type="button"
              onClick={() => {
                setLoadError(false);
                setAttempt((n) => n + 1);
              }}
              className="pressable h-11 rounded-button bg-fill px-4 type-body font-semibold"
            >
              다시 불러오기
            </button>
          </div>
        ) : loading || !shape ? (
          <div
            aria-busy="true"
            className="flex size-full items-center justify-center rounded-card bg-fill/60"
          >
            <span className="type-caption text-muted">
              지도를 불러오고 있어요
            </span>
          </div>
        ) : (
          <div
            style={{ aspectRatio: `${shape.width} / ${shape.height}` }}
            className="relative max-h-full max-w-full"
          >
            <svg
              viewBox={shape.viewBox}
              role="img"
              aria-label={`${provinceName ?? "전국"} 영토 지도`}
              className="block size-full"
              onClick={(event) => {
                const target = event.target as Element;
                const code = target.getAttribute("data-code");
                const name = target.getAttribute("data-name");
                if (code && name) choose(code, name);
              }}
            >
              {shape.paths.map((path) => {
                const ratio = ratioOf(path.code);
                const isSelected = selected === path.code;
                const isHovered = hoveredCode === path.code;
                return (
                  <path
                    key={path.code}
                    d={path.d}
                    data-code={path.code}
                    data-name={path.name}
                    fillRule="evenodd"
                    vectorEffect="non-scaling-stroke"
                    strokeWidth={isSelected ? 2.2 : isHovered ? 1.5 : 1}
                    strokeOpacity={isSelected || isHovered ? 1 : 0.85}
                    strokeLinejoin="round"
                    onMouseEnter={() => setHoveredCode(path.code)}
                    onMouseLeave={() =>
                      setHoveredCode((prev) =>
                        prev === path.code ? null : prev,
                      )
                    }
                    className={
                      "cursor-pointer transition-opacity duration-150 " +
                      (ratio === 1
                        ? "fill-map-full"
                        : ratio > 0 || isHovered
                          ? "fill-map-partial"
                          : "fill-map-empty") +
                      (isSelected ? " stroke-accent-dark" : " stroke-map-line")
                    }
                  />
                );
              })}
            </svg>

            {/* 호버/선택 지역 위 하얀 말풍선 */}
            {bubblePath && (
              <div
                style={{
                  left: `${(bubblePath.labelX / shape.width) * 100}%`,
                  top: `${(bubblePath.labelY / shape.height) * 100}%`,
                  transform: "translate(-50%, -120%)",
                }}
                className="pointer-events-none absolute z-10 rounded-xl bg-surface px-3 py-1 text-xs font-semibold whitespace-nowrap text-foreground shadow-float ring-1 ring-line"
              >
                {bubblePath.name}
              </div>
            )}
          </div>
        )}
      </div>

      {regions.length > 0 && (
        <ul
          aria-label={`${provinceName ?? "전국"} 지역 목록`}
          className="flex flex-wrap gap-2"
        >
          {regions.map((region) => {
            const label =
              province === NATION
                ? getTravelProvinceName(region.code, region.name)
                : region.name;
            const ratio = ratioOf(region.code);
            const count =
              province === NATION
                ? (territoriesOf.get(region.code)?.length ?? 0)
                : 0;
            const done = province === NATION ? Math.round(ratio * count) : 0;
            const isSelected = selected === region.code;
            return (
              <li key={region.code}>
                <button
                  type="button"
                  aria-pressed={province === NATION ? undefined : isSelected}
                  onClick={() => choose(region.code, label)}
                  className={
                    "inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-button px-3 text-sm font-medium focus-ring transition-colors duration-150 " +
                    (isSelected
                      ? "bg-foreground text-background"
                      : "bg-fill text-foreground hover:bg-foreground/10")
                  }
                >
                  {province !== NATION && owned.has(region.code) && (
                    <Icon name="check" size={16} className="text-accent-dark" />
                  )}
                  {label}
                  {province === NATION ? (
                    <span className="text-muted tabular-nums">
                      {done}/{count}
                    </span>
                  ) : (
                    owned.has(region.code) && (
                      <span className="sr-only">, 칠함</span>
                    )
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {meta && (
        <p className="type-caption font-normal text-muted">
          통계청 SGIS({meta.sourceDate}) · krmap · admdongkor (CC BY 4.0) 행정구역
          경계 기준
        </p>
      )}
    </section>
  );
}
