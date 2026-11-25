"use client";

import { useState } from "react";
import { TerritoryMap } from "@/components/em/TerritoryMap";
import { GlassCard } from "@/components/ui";

type Visited = { code: string; label: string };
type Stat = { mine: number; others: number };

/*
 * 내 영토 상세. 지도나 목록에서 영토를 고르면 내 후기 수와 다른 사람 후기 수를 보여준다.
 * 숫자는 props로만 받는다(지금은 예시). 실제 집계 API가 정해지면 부모에서 바꿔 넘긴다.
 */
export function TerritoryExplorer({
  visited,
  stats,
}: {
  visited: readonly Visited[];
  /** 영토 코드별 후기 수. 없는 영토는 '아직 없어요'로 보여준다. */
  stats: Readonly<Record<string, Stat>>;
}) {
  const [selected, setSelected] = useState<{ code: string; name: string } | null>(null);
  const stat = selected ? stats[selected.code] : undefined;
  const isVisited = selected ? visited.some((v) => v.code === selected.code) : false;

  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-8 2xl:grid-cols-[minmax(0,1fr)_26rem]">
      <GlassCard className="order-2 p-4 lg:order-none lg:p-6">
        <TerritoryMap
          territoryView
          visited={visited.map((v) => v.code)}
          selectedCode={selected?.code ?? null}
          onSelectTerritory={setSelected}
        />
      </GlassCard>

      <div className="contents lg:flex lg:flex-col lg:gap-6">
        <section aria-labelledby="territory-detail" className="order-1 flex flex-col gap-1 lg:order-none">
          <div className="flex min-h-11 items-center">
            <h2 id="territory-detail" className="type-section">{selected ? selected.name : "영토를 골라 보세요"}</h2>
          </div>
          {!selected ? (
            <a href="#visited-title" className="pressable focus-ring inline-flex min-h-11 w-fit items-center rounded-button px-2 type-body font-semibold text-accent-dark">다녀온 곳에서 고르기</a>
          ) : (
            <GlassCard className="flex flex-col gap-1 px-4 py-2">
              <dl aria-live="polite" className="flex flex-col">
                <div className="flex min-h-11 items-center justify-between border-b border-line">
                  <dt className="type-body">내 후기</dt>
                  <dd className="type-row font-semibold tabular-nums">{stat ? `${stat.mine}개` : isVisited ? "0개" : "아직 없어요"}</dd>
                </div>
                <div className="flex min-h-11 items-center justify-between">
                  <dt className="type-body">다른 사람 후기</dt>
                  <dd className="type-row font-semibold tabular-nums">{stat ? `${stat.others}개` : "준비 중이에요"}</dd>
                </div>
              </dl>
            </GlassCard>
          )}
        </section>

        <section aria-labelledby="visited-title" className="order-3 flex flex-col gap-1 lg:order-none">
          <div className="flex min-h-11 items-center">
            <h2 id="visited-title" className="type-section">다녀온 곳 {visited.length}곳</h2>
          </div>
          <GlassCard className="p-2">
            <ul className="flex flex-col">
              {visited.map((v) => (
                <li key={v.code}>
                  <button
                    type="button"
                    aria-pressed={selected?.code === v.code}
                    onClick={() => setSelected({ code: v.code, name: v.label })}
                    className={
                      "pressable focus-ring flex min-h-11 w-full cursor-pointer items-center justify-between rounded-button px-2 text-left type-body " +
                      (selected?.code === v.code ? "bg-accent-weak font-semibold" : "hover:bg-fill")
                    }
                  >
                    {v.label}
                    <span className="tabular-nums text-foreground">{stats[v.code] ? `${stats[v.code].mine}개` : ""}</span>
                  </button>
                </li>
              ))}
            </ul>
          </GlassCard>
        </section>
      </div>
    </div>
  );
}
