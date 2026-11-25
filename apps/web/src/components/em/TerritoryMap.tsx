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
  className?: string;
};

export function TerritoryMap({ visited, onSelectTerritory, className = "" }: TerritoryMapProps) {
  const [meta, setMeta] = useState<RegionMeta | null>(null);
  const [metaError, setMetaError] = useState(false);
  const [province, setProvince] = useState(NATION);
  const [shape, setShape] = useState<Shape | null>(null);
  const [shapeError, setShapeError] = useState("");
  const [selected, setSelected] = useState("");
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
    const file = meta.provinces.find((p) => p.code === province)?.svg ?? "korea.svg";
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
  }, [meta, province, shapeKey]);

  // 시도를 바꾼 뒤 키보드 사용자가 길을 잃지 않게 제목으로 포커스를 옮긴다(누른 버튼이 사라지므로).
  useEffect(() => {
    if (movedByUser.current) headingRef.current?.focus();
  }, [province]);

  const owned = useMemo(() => new Set(visited), [visited]);
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

  function ratioOf(code: string) {
    if (province !== NATION) return owned.has(code) ? 1 : 0;
    const list = territoriesOf.get(code) ?? [];
    if (list.length === 0) return 0;
    return list.filter((t) => owned.has(t.code)).length / list.length;
  }

  function choose(code: string, name: string) {
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
    setSelected("");
    setProvince(NATION);
  }

  const loading = !metaError && (!meta || (shape?.key !== shapeKey && shapeError !== shapeKey));
  const failed = metaError || shapeError === shapeKey;

  return (
    <section aria-labelledby={titleId} className={`flex flex-col gap-4 ${className}`}>
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
        <h3 id={titleId} ref={headingRef} tabIndex={-1} className="type-section outline-none">
          {provinceName ?? "전국"}
        </h3>
      </div>

      <div className="relative aspect-[4/5] max-h-[min(65vh,560px)] w-full">
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
            aria-label={`${provinceName ?? "전국"} 영토 지도`}
            className="size-full"
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
              return (
                <path
                  key={path.code}
                  d={path.d}
                  data-code={path.code}
                  data-name={path.name}
                  fillRule="evenodd"
                  vectorEffect="non-scaling-stroke"
                  strokeWidth={isSelected ? 2.5 : 1}
                  className={
                    "cursor-pointer transition-opacity duration-150 hover:opacity-80 " +
                    (ratio === 1 ? "fill-map-full" : ratio > 0 ? "fill-map-partial" : "fill-map-empty") +
                    (isSelected ? " stroke-accent-dark" : " stroke-map-line")
                  }
                >
                  <title>{path.name}</title>
                </path>
              );
            })}
            <IslandOutlines province={province || null} className={ratioOf(province || "47") === 1 ? "fill-map-full" : ratioOf(province || "47") > 0 ? "fill-map-partial" : "fill-map-empty"} />
          </svg>
        )}
      </div>

      {regions.length > 0 && (
        <ul aria-label={`${provinceName ?? "전국"} 지역 목록`} className="flex flex-wrap gap-2">
          {regions.map((region) => {
            const ratio = ratioOf(region.code);
            const count = province === NATION ? territoriesOf.get(region.code)?.length ?? 0 : 0;
            const done = province === NATION ? Math.round(ratio * count) : 0;
            const isSelected = selected === region.code;
            return (
              <li key={region.code}>
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
                      {done}/{count}
                    </span>
                  ) : (
                    owned.has(region.code) && <span className="sr-only">, 칠함</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {meta && (
        <p className="type-caption font-normal text-muted">
          경계는 단순화한 예시예요. 통계청 SGIS({meta.sourceDate}) · krmap, admdongkor(CC BY 4.0)를 바꿔 그렸어요.
        </p>
      )}
    </section>
  );
}
