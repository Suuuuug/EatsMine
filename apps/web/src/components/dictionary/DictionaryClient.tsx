"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActionButton, EmptyState, ProgressBar } from "@/components/em";
import { Icon } from "@/components/icon/Icon";
import {
  SAMPLE_COLLECTED_FOOD_IDS,
  SEASONAL_FOODS,
  SEASON_TABS,
} from "@/data/seasonal-foods";
import type { SeasonKey } from "@/types/dictionary";

type CollectionFilter = "all" | "collected" | "uncollected";

const COLLECTION_OPTIONS: { key: CollectionFilter; label: string }[] = [
  { key: "all", label: "전체 상태" },
  { key: "collected", label: "수집" },
  { key: "uncollected", label: "미수집" },
];

function ChevronDownIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`text-muted transition-transform duration-150 ${open ? "rotate-180" : ""}`}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/** 투명 텍스트 트리거 + 유리 패널(material-thick) 기반 수집 상태 드롭다운 */
function CollectionFilterDropdown({
  value,
  onChange,
}: {
  value: CollectionFilter;
  onChange: (next: CollectionFilter) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const currentLabel =
    COLLECTION_OPTIONS.find((option) => option.key === value)?.label ?? "전체 상태";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="수집 상태 필터 선택"
        onClick={() => setOpen((prev) => !prev)}
        className={
          "pressable inline-flex h-9 items-center gap-1.5 rounded-input px-2.5 text-xs font-medium transition-colors " +
          (open ? "bg-fill text-foreground" : "text-muted hover:text-foreground")
        }
      >
        <Icon name="filter" size={13} className="shrink-0 opacity-75" />
        <span>{currentLabel}</span>
        <ChevronDownIcon open={open} />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="수집 상태 목록"
          className="material-thick absolute right-0 z-30 mt-1.5 min-w-28 rounded-input p-1"
        >
          {COLLECTION_OPTIONS.map((option) => {
            const selected = option.key === value;
            return (
              <button
                key={option.key}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(option.key);
                  setOpen(false);
                }}
                className={
                  "pressable flex min-h-8 w-full items-center justify-between rounded-[7px] px-2.5 py-1 text-left text-xs transition-colors " +
                  (selected
                    ? "bg-accent-weak font-semibold text-accent-dark"
                    : "text-muted hover:text-foreground")
                }
              >
                <span>{option.label}</span>
                {selected && <Icon name="check" size={13} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function DictionaryClient() {
  const [query, setQuery] = useState("");
  const [selectedSeason, setSelectedSeason] = useState<SeasonKey>("all");
  const [collectionFilter, setCollectionFilter] = useState<CollectionFilter>("all");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 백엔드(/api/me/collection) 연결 전까지는 예시 수집 상태 사용
  const collectedSet = useMemo(() => new Set(SAMPLE_COLLECTED_FOOD_IDS), []);

  // 계절별 전체 수 / 수집 수 집계
  const seasonStats = useMemo(() => {
    const stats: Record<SeasonKey, { collected: number; total: number }> = {
      all: { collected: 0, total: 0 },
      spring: { collected: 0, total: 0 },
      summer: { collected: 0, total: 0 },
      autumn: { collected: 0, total: 0 },
      winter: { collected: 0, total: 0 },
    };

    for (const food of SEASONAL_FOODS) {
      const isCollected = collectedSet.has(food.id);
      stats.all.total += 1;
      stats[food.season].total += 1;
      if (isCollected) {
        stats.all.collected += 1;
        stats[food.season].collected += 1;
      }
    }

    return stats;
  }, [collectedSet]);

  const filteredFoods = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    return SEASONAL_FOODS.filter((food) => {
      if (selectedSeason !== "all" && food.season !== selectedSeason) {
        return false;
      }

      const isCollected = collectedSet.has(food.id);
      if (collectionFilter === "collected" && !isCollected) {
        return false;
      }
      if (collectionFilter === "uncollected" && isCollected) {
        return false;
      }

      if (!keyword) return true;

      const haystack = [
        food.name,
        food.seasonLabel,
        ...food.keywords,
        ...food.regions,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(keyword);
    });
  }, [query, selectedSeason, collectionFilter, collectedSet]);

  const activeSeasonStat = seasonStats[selectedSeason];
  const activeSeasonLabel =
    selectedSeason === "all"
      ? "모은 음식"
      : `${SEASON_TABS.find((t) => t.key === selectedSeason)?.label ?? ""} 음식`;

  const resetFilters = () => {
    setQuery("");
    setSelectedSeason("all");
    setCollectionFilter("all");
  };

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 md:px-8 md:py-12">
      {/* 1행: 1순위 페이지 제목 + 아담한 보조 검색창(h-9, 14px) */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-3xl leading-tight font-bold tracking-[-0.025em] text-foreground sm:text-4xl">
          제철음식 도감
        </h1>

        <form
          role="search"
          onSubmit={(event) => event.preventDefault()}
          className="flex h-9 w-full items-center gap-2 rounded-input bg-surface/40 px-3 shadow-[inset_0_0_0_1px_var(--color-line)] transition-colors focus-within:bg-surface/90 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent sm:w-52"
        >
          <Icon name="search" size={15} className="shrink-0 text-muted/80" />
          <input
            ref={searchInputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="음식 또는 지역 검색"
            placeholder="음식·지역 검색"
            enterKeyHint="search"
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted/75 [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              aria-label="검색어 지우기"
              onClick={() => {
                setQuery("");
                searchInputRef.current?.focus();
              }}
              className="inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted hover:text-foreground focus-ring"
            >
              <Icon name="close" size={14} />
            </button>
          )}
        </form>
      </header>

      {/* 2행: 배경에 묻히지 않도록 흰 표면 카드로 감싼 수집 진행도 */}
      <section aria-label="제철음식 수집 현황">
        <div className="rounded-card border border-line bg-surface/85 px-5 py-4 shadow-card">
          <ProgressBar
            label={`${activeSeasonLabel}(예시)`}
            value={activeSeasonStat.collected}
            max={activeSeasonStat.total}
            unit="종"
            className="[&_span:first-child]:text-sm"
          />
        </div>
      </section>

      {/* 3행: 필터 줄(좌: 14px 계절 탭 / 우: 12px 수집 드롭다운) + 4열 카드 그리드 */}
      <section className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line">
          <div
            className="flex flex-wrap items-center gap-5"
            role="tablist"
            aria-label="계절 필터"
          >
            {SEASON_TABS.map((tab) => {
              const active = selectedSeason === tab.key;
              const stat = seasonStats[tab.key];
              const isComplete = stat.total > 0 && stat.collected === stat.total;

              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSelectedSeason(tab.key)}
                  className={
                    "relative inline-flex min-h-10 items-center justify-center gap-1.5 px-0.5 text-sm transition-colors focus-ring " +
                    (active
                      ? "font-semibold text-foreground"
                      : "font-medium text-muted hover:text-foreground")
                  }
                >
                  <span>{tab.label}</span>
                  <span className="text-xs font-normal tabular-nums opacity-65">
                    {stat.collected}/{stat.total}
                  </span>
                  {isComplete && (
                    <span
                      aria-hidden="true"
                      className="size-1.5 rounded-full bg-accent"
                    />
                  )}
                  {active && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-accent"
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="shrink-0">
            <CollectionFilterDropdown
              value={collectionFilter}
              onChange={setCollectionFilter}
            />
          </div>
        </div>

        {/* 4행: 4열 컴팩트 도감 카드 그리드 (클릭 시 /?food={id} 로 지도 이동) */}
        {filteredFoods.length === 0 ? (
          <div className="rounded-card border border-line bg-surface/80 py-8 shadow-card">
            <EmptyState
              illustration="empty-search"
              message="고른 계절과 검색어에 맞는 제철음식이 없어요."
              action={
                <ActionButton variant="tinted" size="sm" onClick={resetFilters}>
                  조건 초기화
                </ActionButton>
              }
            />
          </div>
        ) : (
          <ul
            aria-label="제철음식 목록"
            className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
          >
            {filteredFoods.map((food) => {
              const isCollected = collectedSet.has(food.id);
              const regionSummary = food.regions.join(" · ");

              return (
                <li key={food.id}>
                  <Link
                    href={`/?food=${encodeURIComponent(food.id)}`}
                    className="pressable group flex h-full flex-col rounded-card border border-line bg-surface/80 p-4 shadow-card transition-colors hover:border-accent/40 focus-ring"
                  >
                    {/* 상단 공식 음식 SVG 일러스트 (수집: 원색 + ✓ / 미수집: 흑백 옅게) */}
                    <div className="flex items-center justify-center py-4">
                      <span className="relative inline-flex size-20 items-center justify-center">
                        <Image
                          src={food.src}
                          alt=""
                          width={76}
                          height={76}
                          className={
                            "transition-transform duration-200 group-hover:scale-105 " +
                            (isCollected ? "" : "opacity-55 grayscale")
                          }
                        />
                        {isCollected && (
                          <span
                            aria-hidden="true"
                            className="absolute right-0 bottom-0 flex size-6 items-center justify-center rounded-full bg-accent text-on-accent ring-2 ring-surface"
                          >
                            <Icon name="check" size={14} />
                          </span>
                        )}
                      </span>
                    </div>

                    {/* 하단 음식명(16px) · 주요 지역(12px) · 제철 시기(12px) */}
                    <div className="mt-auto flex flex-col gap-1 border-t border-line pt-3">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-base leading-snug font-semibold tracking-[-0.01em] ${
                            isCollected ? "text-foreground" : "text-muted"
                          }`}
                        >
                          {food.name}
                          <span className="sr-only">
                            {isCollected ? ", 수집함" : ", 아직 수집 안 함"}
                          </span>
                        </span>
                        <Icon
                          name="chevron-right"
                          size={15}
                          className="shrink-0 text-muted transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-accent-dark"
                        />
                      </div>

                      {regionSummary && (
                        <p className="truncate text-xs text-muted">
                          {regionSummary}
                        </p>
                      )}

                      <p className="mt-0.5 text-xs font-medium text-muted/80 tabular-nums">
                        {food.seasonLabel}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
