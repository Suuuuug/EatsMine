"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { actionButtonClass, EmptyState, SkeletonRow, TerritoryMap } from "@/components/em";
import { Icon } from "@/components/icon/Icon";
import { RestaurantRow } from "@/components/map/RestaurantRow";
import { useRestaurants } from "@/lib/map/use-restaurants";
import { escapeAction, groupByProvince, resolveSelectedRegion, type Territory } from "@/lib/dictionary/food-region-selection";
import type { SeasonalFoodItem } from "@/types/dictionary";
import { FoodRegionList } from "./FoodRegionList";

const apiBase = process.env.NEXT_PUBLIC_API_URL;

type Props = {
  food: SeasonalFoodItem;
  /** URL의 regionCode(검증 전). */
  regionCode: string | null;
  onSelectRegion: (code: string | null) => void;
  onBack: () => void;
};

/** 음식을 고른 뒤의 화면: 왼쪽 지역·식당 목록, 오른쪽 영토 지도(좁은 화면은 지도 위, 목록 아래). */
export function FoodDetail({ food, regionCode, onSelectRegion, onBack }: Props) {
  const [territories, setTerritories] = useState<Territory[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/images/maps/region-codes.json", { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: { territories: Territory[] }) => setTerritories(data.territories))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const regions = useMemo(() => {
    if (territories.length === 0) return food.regions;
    const valid = new Set(groupByProvince(food.regions.map((r) => r.code), territories).flatMap((g) => g.codes));
    return food.regions.filter((r) => valid.has(r.code));
  }, [food.regions, territories]);
  const codes = useMemo(() => regions.map((r) => r.code), [regions]);

  // 추천 지역이 한 도(시도) 안에만 있으면 그 도의 시군구 지도로 바로 보여 준다. 여러 도에 걸치면 전국 시군구 지도.
  const onlyProvince = useMemo(() => {
    const set = new Set(regions.map((r) => territories.find((t) => t.code === r.code)?.parentCode ?? ""));
    return set.size === 1 && !set.has("") ? [...set][0] : null;
  }, [regions, territories]);

  const selected = resolveSelectedRegion(regions, regionCode);
  const selectedName = regions.find((r) => r.code === selected)?.name ?? "";

  const headingRef = useRef<HTMLHeadingElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    window.scrollTo(0, 0);
    headingRef.current?.focus();
  }, [food.id]);

  const prevSelected = useRef<string | null>(selected);
  useEffect(() => {
    const prev = prevSelected.current;
    prevSelected.current = selected;
    const rows = listRef.current?.querySelectorAll<HTMLElement>("button[aria-expanded]");
    if (!selected) {
      // 열려 있던 식당 패널이 사라지며 포커스가 문서로 빠지면 방금 보던 지역 행으로 돌려준다.
      const active = document.activeElement;
      if (prev && (!active || active === document.body)) rows?.[regions.findIndex((r) => r.code === prev)]?.focus();
      return;
    }
    const row = listRef.current?.querySelector<HTMLElement>('button[aria-expanded="true"]');
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    row?.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
  }, [selected, regions]);

  function chooseFromList(code: string | null) {
    if (code === null) {
      if (regions.length > 1) onSelectRegion(null);
      return;
    }
    onSelectRegion(code);
  }

  function onKeyDown(e: KeyboardEvent<HTMLElement>) {
    if (e.key !== "Escape" || e.defaultPrevented) return;
    const action = escapeAction({ food: food.id, regionCode: selected && regions.length > 1 ? selected : null }, regions.length);
    if (action === "clearRegion") onSelectRegion(null);
    else if (action === "clearFood") onBack();
  }

  const backButton = (
    <button type="button" onClick={onBack} className="pressable -ml-2 inline-flex h-11 items-center gap-1 self-start rounded-button pr-3 pl-1.5 type-body font-medium text-accent-dark focus-ring">
      <Icon name="back" size={20} />
      도감으로
    </button>
  );

  return (
    <section aria-labelledby="food-detail-title" onKeyDown={onKeyDown} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        {backButton}
        <h2 id="food-detail-title" ref={headingRef} tabIndex={-1} className="type-title outline-none">{food.name}</h2>
        <p className="type-body text-foreground">제철 {food.seasonLabel}</p>
      </div>

      <p role="status" className="sr-only">{selected ? `${food.name}, ${selectedName} 선택` : `${food.name} 선택`}</p>

      {regions.length === 0 ? (
        <div className="rounded-card border border-line bg-surface">
          <EmptyState
            illustration="empty-search"
            message="추천 지역이 아직 없어요."
            action={<Link href="/" className={actionButtonClass({ variant: "tinted", size: "md" })}>지도에서 직접 찾기</Link>}
          />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(280px,380px)_minmax(0,1fr)] lg:items-start lg:gap-6">
          <div className="lg:col-start-2 lg:row-start-1 lg:sticky lg:top-20">
            <TerritoryMap
              visited={[]}
              highlighted={codes}
              {...(onlyProvince ? { province: onlyProvince, onProvinceChange: () => {} } : { territoryView: true })}
              selectedCode={selected}
              onSelectTerritory={({ code }) => { if (codes.includes(code)) onSelectRegion(code); }}
              className="[&>div:first-child]:hidden [&_ul]:hidden [&>div.relative]:max-h-[min(42vh,420px)] lg:[&>div.relative]:max-h-[min(70vh,620px)]"
            />
          </div>
          <div ref={listRef} className="min-w-0 overflow-hidden rounded-card border border-line bg-surface lg:col-start-1 lg:row-start-1">
            <FoodRegionList regions={regions} selectedCode={selected} onSelect={chooseFromList}>
              {selected && <RegionRestaurants regionCode={selected} />}
            </FoodRegionList>
          </div>
        </div>
      )}
    </section>
  );
}

function RegionRestaurants({ regionCode }: { regionCode: string }) {
  const [attempt, setAttempt] = useState(0);
  const { result, loading, error } = useRestaurants(regionCode, attempt);

  if (!apiBase || regionCode.startsWith("12")) {
    return <p className="py-3 type-body">식당 정보 연결을 준비하고 있어요.</p>;
  }
  if (loading) {
    return (
      <div aria-busy="true">
        <p role="status" className="pt-3 type-body">식당을 찾고 있어요.</p>
        <div aria-hidden="true"><SkeletonRow /><SkeletonRow /></div>
      </div>
    );
  }
  if (error) {
    return (
      <div role="alert" className="flex flex-col items-start gap-2 py-3">
        <p className="type-body">{error}</p>
        <button type="button" onClick={() => setAttempt((n) => n + 1)} className="pressable min-h-11 rounded-button bg-fill px-4 type-body font-semibold focus-ring">다시 불러오기</button>
      </div>
    );
  }
  if (!result || result.items.length === 0) {
    return <p className="py-3 type-body">이 지역에서 찾은 식당이 없어요. 다른 지역을 골라 보세요.</p>;
  }
  return (
    <div>
      <p className="pt-3 pb-1 type-caption text-foreground">음식 이름으로 좁히는 기능은 준비하고 있어요.</p>
      <ul className="m-0 list-none p-0">
        {result.items.map((p) => (
          <li key={p.id}>
            <RestaurantRow name={p.name} address={p.address} rankNational={p.rankNational} estimatedHours={p.estimatedHours} merUrl={p.merUrl} />
          </li>
        ))}
      </ul>
      <p className="py-3 type-caption text-muted">eat.pl 잇플 · BC카드 결제 데이터 기반</p>
    </div>
  );
}
