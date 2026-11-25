"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icon/Icon";
import { IslandOutlines } from "@/components/map/IslandOutlines";

/*
 * 영토 지도(수집 현황 표시용 SVG). 전국 16개 시도 → 시도를 고르면 그 안의 영토(키트 기준 230곳).
 * - 경계는 public/images/maps의 단순화 미리보기(preview-approximate)다. 위치 판정·영토 획득에 쓰지 않는다.
 *   정식 경계는 scripts/maps/rebuild_maps.py로 만든다.
 * - SVG 문자열을 HTML로 넣지 않고 DOMParser로 path의 d만 읽어 다시 그린다.
 * - 키보드·화면 읽기는 아래 지역 버튼 목록으로 조작한다. path 230개를 탭 순서에 넣지 않는다.
 * - 칠한 영토(visited)는 부모가 서버 상태로 넘긴다. 이 부품은 저장하지 않는다.
 */

type Region = { code: string; name: string; parentCode?: string; svg?: string };
type RegionMeta = { sourceDate: string; geometryQuality: string; provinces: Region[]; territories: Region[] };
type Shape = { key: string; viewBox: string; paths: { code: string; name: string; d: string }[] };

const BASE = "/images/maps";
const NATION = "";

type TerritoryMapProps = {
  /** 칠한 영토 코드(5자리 SGIS 코드). 시도 코드가 아니다. */
  visited: readonly string[];
  /** 영토 하나를 골랐을 때 */
  onSelectTerritory?: (territory: { code: string; name: string }) => void;
  /** 강조할 지역 코드(5자리, 예: 음식이 나는 지역). 전국에서는 해당 시도를, 시도 안에서는 해당 시군구를 칠한다. */
  highlighted?: readonly string[];
  /** 선택 윤곽을 밖에서 제어한다(null이면 선택 없음). 생략하면 내부 상태를 쓴다. */
  selectedCode?: string | null;
  /** 보고 있는 시도 코드를 밖에서 제어한다(""은 전국). 생략하면 내부 상태를 쓴다. */
  province?: string;
  onProvinceChange?: (code: string) => void;
  /** 작은 읽기 전용 미리보기. 지역 버튼 목록과 출처 문구를 숨기고 클릭을 막는다. */
  compact?: boolean;
  /** 전국 화면을 시도가 아니라 시·군·구(광역시는 구) 경계로 그린다. 내 영토처럼 칠한 곳을 한눈에 볼 때 쓴다. */
  territoryView?: boolean;
  className?: string;
};

export function TerritoryMap({
  visited,
  onSelectTerritory,
  highlighted,
  selectedCode,
  province: provinceProp,
  onProvinceChange,
  compact = false,
  territoryView = false,
  className = "",
}: TerritoryMapProps) {
  const [meta, setMeta] = useState<RegionMeta | null>(null);
  const [metaError, setMetaError] = useState(false);
  const [provinceState, setProvinceState] = useState(NATION);
  const province = provinceProp ?? provinceState;
  const [shape, setShape] = useState<Shape | null>(null);
  const [shapeError, setShapeError] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const selected = selectedCode !== undefined ? selectedCode ?? "" : selectedState;
  const [attempt, setAttempt] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  const movedByUser = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${BASE}/region-codes.json`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json() as Promise<RegionMeta>;
      })
      .then((data) => {
        setMeta(data);
        setMetaError(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) setMetaError(true);
      });
    return () => controller.abort();
  }, [attempt]);

  const shapeKey = `${province}#${attempt}`;
  useEffect(() => {
    if (!meta) return;
    const controller = new AbortController();
    const file = province === NATION && territoryView ? "korea-territories.svg" : meta.provinces.find((p) => p.code === province)?.svg ?? "korea.svg";
    fetch(`${BASE}/${file}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.text();
      })
      .then((text) => {
        const doc = new DOMParser().parseFromString(text, "image/svg+xml");
        const viewBox = doc.documentElement.getAttribute("viewBox");
        if (!viewBox || doc.querySelector("parsererror")) throw new Error("svg");
        const paths = Array.from(doc.querySelectorAll("path[data-region-code]")).map((path) => ({
          code: path.getAttribute("data-region-code") ?? "",
          name: path.getAttribute("data-name") ?? "",
          d: path.getAttribute("d") ?? "",
        }));
        setShape({ key: shapeKey, viewBox, paths });
        setShapeError("");
      })
      .catch(() => {
        if (!controller.signal.aborted) setShapeError(shapeKey);
      });
    return () => controller.abort();
  }, [meta, province, shapeKey, territoryView]);

  // 시도를 바꾼 뒤 키보드 사용자가 길을 잃지 않게 제목으로 포커스를 옮긴다(누른 버튼이 사라지므로).
  useEffect(() => {
    if (movedByUser.current) headingRef.current?.focus();
  }, [province]);

  const owned = useMemo(() => new Set(visited), [visited]);
  const marked = useMemo(() => new Set(highlighted ?? []), [highlighted]);
  const territoriesOf = useMemo(() => {
    const map = new Map<string, Region[]>();
    for (const t of meta?.territories ?? []) {
      const list = map.get(t.parentCode ?? "") ?? [];
      list.push(t);
      map.set(t.parentCode ?? "", list);
    }
    return map;
  }, [meta]);

  const provinceName = meta?.provinces.find((p) => p.code === province)?.name;
  const regions = province === NATION ? meta?.provinces ?? [] : territoriesOf.get(province) ?? [];

  const territoryShapes = territoryView && province === NATION;
  function ratioOf(code: string) {
    if (province !== NATION || territoryShapes) return owned.has(code) ? 1 : 0;
    const list = territoriesOf.get(code) ?? [];
    if (list.length === 0) return 0;
    return list.filter((t) => owned.has(t.code)).length / list.length;
  }

  // 강조 지역은 전국에서는 시도 단위, 시도 안에서는 시군구 단위로 칠한다(칠한 영토와 같은 map-partial 색).
  function markedAt(code: string) {
    if (province !== NATION || territoryShapes) return marked.has(code);
    return (territoriesOf.get(code) ?? []).some((t) => marked.has(t.code));
  }
  // 칠한 영토는 맨 위에 그려 윤곽이 이웃에 덮이지 않게 한다.
  function isFilled(code: string) {
    return (province !== NATION || territoryShapes) && owned.has(code);
  }
  function fillOf(code: string) {
    const ratio = ratioOf(code);
    if (ratio === 1) return "fill-map-full";
    if (markedAt(code)) return "fill-map-full"; // 추천 지역은 주변과 확실히 구분되도록 가장 진한 색
    return ratio > 0 ? "fill-map-partial" : "fill-map-empty";
  }

  // 칠한 지역을 글로도 알린다(색만으로 전하지 않는다).
  const markedNames = useMemo(() => {
    if (!meta || marked.size === 0) return [] as string[];
    const provinceNames = new Map(meta.provinces.map((p) => [p.code, p.name]));
    return meta.territories
      .filter((t) => marked.has(t.code) && (province === NATION || t.parentCode === province))
      .map((t) => `${provinceNames.get(t.parentCode ?? "") ?? ""} ${t.name}`.trim());
  }, [meta, marked, province]);
  const markedText = markedNames.length > 0 ? `추천 지역: ${markedNames.join(", ")}` : "";

  function choose(code: string, name: string) {
    if (compact) return;
    if (province === NATION) {
      movedByUser.current = true;
      setSelectedState("");
      setProvinceState(code);
      onProvinceChange?.(code);
    } else {
      setSelectedState(code);
      onSelectTerritory?.({ code, name });
    }
  }

  function choosePath(code: string, name: string) {
    if (territoryShapes) {
      setSelectedState(code);
      onSelectTerritory?.({ code, name });
    } else choose(code, name);
  }

  function backToNation() {
    movedByUser.current = true;
    setSelectedState("");
    setProvinceState(NATION);
    onProvinceChange?.(NATION);
  }

  const loading = !metaError && (!meta || (shape?.key !== shapeKey && shapeError !== shapeKey));
  const failed = metaError || shapeError === shapeKey;

  return (
    <section aria-labelledby={titleId} className={`flex flex-col gap-4 ${className}`}>
      <div className="flex min-h-11 items-center gap-1">
        {province !== NATION && !compact && (
          <button
            type="button"
            onClick={backToNation}
            className="pressable -ml-2 inline-flex h-11 items-center gap-1 rounded-button pr-3 pl-1.5 type-body font-medium text-accent-dark"
          >
            <Icon name="back" size={20} />
            전국
          </button>
        )}
        <h3 id={titleId} ref={headingRef} tabIndex={-1} className={compact ? "sr-only" : "type-section outline-none"}>
          {provinceName ?? "전국"}
        </h3>
      </div>

      <div className={`relative aspect-[4/5] w-full ${compact ? "max-h-80" : "max-h-[min(78vh,760px)]"}`}>
        {failed ? (
          <div role="alert" className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <p className="type-body">지도를 불러오지 못했어요.</p>
            <button
              type="button"
              onClick={() => setAttempt((n) => n + 1)}
              className="pressable h-11 rounded-button bg-fill px-4 type-body font-semibold"
            >
              다시 불러오기
            </button>
          </div>
        ) : loading || !shape ? (
          <div aria-busy="true" className="flex h-full items-center justify-center rounded-card bg-fill">
            <span className="type-caption text-muted">지도를 불러오고 있어요</span>
          </div>
        ) : (
          <svg
            viewBox={shape.viewBox}
            role="img"
            aria-label={`${provinceName ?? "전국"} 영토 지도${markedText ? `. ${markedText}` : ""}`}
            className="size-full"
            onClick={(event) => {
              if (compact) return;
              const target = event.target as Element;
              const code = target.getAttribute("data-code");
              const name = target.getAttribute("data-name");
              if (code && name) choosePath(code, name);
            }}
          >
            {[...shape.paths].sort((a, b) => Number(isFilled(a.code)) - Number(isFilled(b.code))).map((path) => {
              const isSelected = selected === path.code;
              const filled = isFilled(path.code);
              return (
                <path
                  key={path.code}
                  d={path.d}
                  data-code={path.code}
                  data-name={path.name}
                  fillRule="evenodd"
                  vectorEffect="non-scaling-stroke"
                  strokeWidth={isSelected ? 4 : filled ? 2 : 1}
                  className={
                    (compact ? "pointer-events-none " : "cursor-pointer transition-opacity duration-150 hover:opacity-80 ") +
                    fillOf(path.code) +
                    (isSelected ? " stroke-foreground" : filled ? " stroke-accent-dark" : " stroke-map-line")
                  }
                >
                  <title>{path.name}</title>
                </path>
              );
            })}
            {!territoryShapes && <IslandOutlines province={province || null} className={fillOf(province || "47")} />}
          </svg>
        )}
      </div>

      {markedText && <p className="sr-only">{markedText}</p>}

      {!compact && regions.length > 0 && (
        <ul aria-label={`${provinceName ?? "전국"} 지역 목록`} className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
          {(marked.size > 0 ? regions.filter((r) => (province === NATION ? markedAt(r.code) : marked.has(r.code))) : regions).map((region) => {
            const ratio = ratioOf(region.code);
            const markedCount = province === NATION ? (territoriesOf.get(region.code) ?? []).filter((t) => marked.has(t.code)).length : 0;
            const count = province === NATION ? territoriesOf.get(region.code)?.length ?? 0 : 0;
            const done = province === NATION ? Math.round(ratio * count) : 0;
            const isSelected = selected === region.code;
            return (
              <li key={region.code} className="shrink-0">
                <button
                  type="button"
                  aria-pressed={province === NATION ? undefined : isSelected}
                  onClick={() => choose(region.code, region.name)}
                  className={
                    "inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-button px-3 text-sm font-medium focus-ring transition-colors duration-150 " +
                    (isSelected ? "bg-foreground text-background" : "bg-fill text-foreground hover:bg-foreground/10")
                  }
                >
                  {province !== NATION && owned.has(region.code) && <Icon name="check" size={16} className="text-accent-dark" />}
                  {region.name}
                  {province === NATION ? (
                    <span className="text-muted tabular-nums">
                      {marked.size > 0 ? `추천 지역 ${markedCount}곳` : `${done}/${count}`}
                    </span>
                  ) : (
                    <>
                      {owned.has(region.code) && <span className="sr-only">, 칠함</span>}
                      {marked.has(region.code) && <span className="sr-only">, 추천 지역</span>}
                    </>
                  )}
                  {province === NATION && markedAt(region.code) && <span className="sr-only">, 추천 지역 있음</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {meta && !compact && (
        <p className="type-caption font-normal text-muted">
          경계는 단순화한 예시예요. 통계청 SGIS({meta.sourceDate}) · krmap, admdongkor(CC BY 4.0)를 바꿔 그렸어요.
        </p>
      )}
    </section>
  );
}
