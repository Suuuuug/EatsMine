"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { Icon } from "@/components/icon/Icon";
import { nextRegionIndex } from "./food-region-nav";

export type FoodRegionItem = { code: string; name: string; reason: string };

export type FoodRegionListProps = {
  regions: FoodRegionItem[];
  selectedCode: string | null;
  onSelect: (code: string | null) => void;
  /** 선택된 지역 아래에 부모가 넣는 식당 목록. */
  children?: ReactNode;
};

export function FoodRegionList({ regions, selectedCode, onSelect, children }: FoodRegionListProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const single = regions.length === 1;

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (e.key === "Escape" && selectedCode !== null) { e.preventDefault(); onSelect(null); return; }
    const next = nextRegionIndex(e.key, index, regions.length);
    if (next === null) return;
    e.preventDefault();
    refs.current[next]?.focus();
  }

  return (
    <ul className="m-0 list-none bg-surface p-0">
      {regions.map((r, i) => {
        const selected = r.code === selectedCode;
        return (
          <li key={r.code} className="border-b border-line">
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
