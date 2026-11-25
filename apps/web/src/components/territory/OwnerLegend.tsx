"use client";

import { Icon } from "@/components/icon/Icon";
import type { LegendRow } from "@/lib/territory/owner-view";
import { HATCH_STYLE, OWNER_BG } from "./owner-classes";

type OwnerLegendProps = {
  title: string;
  rows: readonly LegendRow[];
  regionName: (code: string) => string;
  selectedCode: string | null;
  onSelect: (code: string) => void;
  sharedSlotOwners: ReadonlySet<string>;
};

/** 지역별 1위 목록. 색만으로 구분하지 않도록 닉네임과 리뷰 수를 함께 적는다. */
export function OwnerLegend({ title, rows, regionName, selectedCode, onSelect, sharedSlotOwners }: OwnerLegendProps) {
  const topCode = rows.find((row) => row.owner)?.regionCode;
  return (
    <section aria-label={title} className="rounded-card border border-line bg-surface p-4">
      <h2 className="type-section">{title}</h2>
      <ul className="mt-2 divide-y divide-line">
        {rows.map(({ regionCode, owner, slot }) => {
          const selected = selectedCode === regionCode;
          const hatched = owner ? sharedSlotOwners.has(owner.ownerId) : false;
          return (
            <li key={regionCode}>
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => onSelect(regionCode)}
                className={`pressable focus-ring flex min-h-14 w-full items-center gap-3 rounded-input px-2 py-2 text-left ${selected ? "bg-fill" : ""}`}
              >
                <span aria-hidden="true" className={`relative size-5 shrink-0 overflow-hidden rounded-full ${slot ? OWNER_BG[slot] : "border-[1.5px] border-foreground"} ${owner?.isMe ? "outline-2 outline-offset-1 outline-foreground" : ""}`}>
                  {hatched && <span className="absolute inset-0 opacity-45" style={HATCH_STYLE} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate type-caption font-semibold">{regionName(regionCode)}</span>
                  {owner ? (
                    <span className="flex items-center gap-1 type-body font-semibold">
                      {regionCode === topCode && <Icon name="crown" size={18} className="shrink-0 text-accent-dark" />}
                      <span className="truncate">{owner.nickname}</span>
                      {owner.isMe && <><Icon name="check" size={16} className="shrink-0 text-accent-dark" /><span className="sr-only">내가 이 영토의 주인이에요</span></>}
                    </span>
                  ) : <span className="block type-body">아직 주인이 없어요</span>}
                </span>
                {owner && <span className="shrink-0 type-body font-semibold tabular-nums">리뷰 {owner.reviewCount}개</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
