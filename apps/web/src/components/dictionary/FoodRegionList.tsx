"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { Icon } from "@/components/icon/Icon";
import { nextRegionIndex, shouldClearRegionOnEscape } from "./food-region-nav";

export type FoodRegionItem = { code: string; name: string; reason: string };

export type FoodRegionListProps = {
  regions: FoodRegionItem[];
  selectedCode: string | null;
  onSelect: (code: string | null) => void;
  /** 선택된 지역 아래에 부모가 넣는 식당 목록. */
  children?: ReactNode;
  /** 시도 소제목. 각 시도의 첫 시군구 코드 앞에 구분 헤더를 그린다. 한 시도뿐이면 넘기지 않는다. */
  headings?: Readonly<Record<string, string>>;
  /** 큰 지도가 보여 주는 시도의 소제목 키(그 시도의 첫 시군구 코드). 글자색과 아이콘으로 표시한다. */
  activeHeading?: string | null;
};

export function FoodRegionList({ regions, selectedCode, onSelect, children, headings, activeHeading }: FoodRegionListProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const single = regions.length === 1;

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (shouldClearRegionOnEscape(e.key, selectedCode, regions.length)) { e.preventDefault(); onSelect(null); return; }
    const next = nextRegionIndex(e.key, index, regions.length);
    if (next === null) return;
    e.preventDefault();
    refs.current[next]?.focus();
  }

  return (
    <ul className="m-0 list-none bg-surface p-0">
      {regions.map((r, i) => {
        const selected = r.code === selectedCode;
        const heading = headings?.[r.code];
        return (
          <li key={r.code} className="border-b border-line">
            {heading && (
              <h4 className={`flex items-center gap-1 bg-fill px-4 py-2 type-caption font-semibold ${activeHeading === r.code ? "text-accent-dark" : "text-foreground"}`}>
                {heading}
                {activeHeading === r.code && <><Icon name="map" size={16} /><span className="sr-only">, 지도에 표시 중</span></>}
              </h4>
            )}
            <button
              ref={(el) => { refs.current[i] = el; }}
              type="button"
              aria-expanded={selected}
              onClick={() => onSelect(selected ? null : r.code)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={`pressable flex min-h-11 w-full items-center gap-3 px-4 py-2 text-left focus-ring motion-safe:transition-colors ${selected ? "bg-accent-weak" : ""}`}
            >
              <span className="min-w-0 flex-1">
                <span className={`block truncate type-row ${selected ? "font-bold" : "font-semibold"}`}>{r.name}</span>
                <span className="block truncate type-caption text-muted">{single && selected ? `지금 보는 지역 · ${r.reason}` : r.reason}</span>
              </span>
              {selected && <Icon name="check" size={20} className="shrink-0 text-accent-dark" />}
            </button>
            {selected && children && <div className="px-4">{children}</div>}
          </li>
        );
      })}
    </ul>
  );
}
