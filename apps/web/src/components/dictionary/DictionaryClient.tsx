"use client";

import { useSearchParams } from "next/navigation";
import { initialCollectionFilter } from "./collection-filter";
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ActionButton, EmptyState, FoodTile, ProgressBar } from "@/components/em";
import { Icon } from "@/components/icon/Icon";
import { foodSelectionParams, parseFoodSelection } from "@/lib/dictionary/food-region-selection";
import { FoodDetail } from "./FoodDetail";
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

/** 투명 텍스트 트리거 + 유리 패널(material-thick) 기반 수집 상태 드롭다운 (키보드 ↑↓/Home/End/Enter/Esc 지원) */
function CollectionFilterDropdown({
  value,
  onChange,
}: {
  value: CollectionFilter;
  onChange: (next: CollectionFilter) => void;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const optionIdPrefix = useId();

  const selectedIndex = Math.max(
    0,
    COLLECTION_OPTIONS.findIndex((option) => option.key === value),
  );

  const openMenu = (initialIndex = selectedIndex) => {
    setActiveIndex(initialIndex);
    setOpen(true);
  };

  const closeMenu = (restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) {
      requestAnimationFrame(() => triggerRef.current?.focus());
    }
  };

  const commitSelection = (index: number) => {
    const target = COLLECTION_OPTIONS[index];
    if (target) {
      onChange(target.key);
    }
    closeMenu(true);
  };

  useEffect(() => {
    if (!open) return;

    listboxRef.current?.focus();

    const handleOutsideClick = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [open]);

  const currentLabel =
    COLLECTION_OPTIONS[selectedIndex]?.label ?? "전체 상태";
  const activeOption = COLLECTION_OPTIONS[activeIndex] ?? COLLECTION_OPTIONS[0];

  const handleTriggerKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
  ) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      openMenu(selectedIndex);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      openMenu(selectedIndex);
    } else if (event.key === "Home") {
      event.preventDefault();
      openMenu(0);
    } else if (event.key === "End") {
      event.preventDefault();
      openMenu(COLLECTION_OPTIONS.length - 1);
    }
  };

  const handleListboxKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>,
  ) => {
    const count = COLLECTION_OPTIONS.length;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((prev) => (prev + 1) % count);
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((prev) => (prev - 1 + count) % count);
        break;
      case "Home":
        event.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        event.preventDefault();
        setActiveIndex(count - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        commitSelection(activeIndex);
        break;
      case "Escape":
        event.preventDefault();
        closeMenu(true);
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-label="수집 상태 필터 선택"
        onClick={() => (open ? closeMenu(false) : openMenu(selectedIndex))}
        onKeyDown={handleTriggerKeyDown}
        className={
          "pressable inline-flex h-11 items-center gap-1.5 rounded-input px-2.5 text-xs font-medium transition-colors " +
          (open ? "bg-fill text-foreground" : "text-muted hover:text-foreground")
        }
      >
        <Icon name="filter" size={13} className="shrink-0 opacity-75" />
        <span>{currentLabel}</span>
        <ChevronDownIcon open={open} />
      </button>

      {open && (
        <div
          ref={listboxRef}
          id={listboxId}
          role="listbox"
          tabIndex={-1}
          aria-label="수집 상태 목록"
          aria-activedescendant={`${optionIdPrefix}-${activeOption.key}`}
          onKeyDown={handleListboxKeyDown}
          className="material-thick absolute right-0 z-30 mt-1.5 min-w-32 rounded-input p-1 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {COLLECTION_OPTIONS.map((option, index) => {
            const selected = option.key === value;
            const highlighted = index === activeIndex;
            return (
              <div
                key={option.key}
                id={`${optionIdPrefix}-${option.key}`}
                role="option"
                aria-selected={selected}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => commitSelection(index)}
                className={
                  "flex min-h-11 w-full cursor-pointer items-center justify-between rounded-[7px] px-2.5 py-1 text-left text-xs transition-colors " +
                  (selected
                    ? "bg-accent-weak font-semibold text-accent-dark"
                    : highlighted
                      ? "bg-fill text-foreground"
                      : "text-muted hover:text-foreground")
                }
              >
                <span>{option.label}</span>
                {selected && <Icon name="check" size={13} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function DictionaryClient() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [selectedSeason, setSelectedSeason] = useState<SeasonKey>("all");
  useEffect(() => {
    if (selectedSeason === "all") delete document.documentElement.dataset.dictionarySeason;
    else document.documentElement.dataset.dictionarySeason = selectedSeason;
    return () => { delete document.documentElement.dataset.dictionarySeason; };
  }, [selectedSeason]);
  const [collectionFilter, setCollectionFilter] =
    useState<CollectionFilter>(() => initialCollectionFilter(searchParams.get("collection")));
  const collectionParam = searchParams.get("collection");
  useEffect(() => {
    if (collectionParam === null) return;
    const timer = window.setTimeout(() => setCollectionFilter(initialCollectionFilter(collectionParam)), 0);
    return () => window.clearTimeout(timer);
  }, [collectionParam]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 음식·지역 선택은 URL이 정본이다. pushState로 바꾸면 Next가 useSearchParams에 반영하고, 뒤로 가기·새로고침도 같은 경로로 복원된다.
  const knownSlugs = useMemo(() => new Set(SEASONAL_FOODS.map((f) => f.id)), []);
  const selection = parseFoodSelection(new URLSearchParams(searchParams.toString()), knownSlugs);
  const selectedFood = SEASONAL_FOODS.find((f) => f.id === selection.food) ?? null;
  const gridScroll = useRef<number | null>(null);
  const lastTile = useRef<string | null>(null);
  const hadFood = useRef(false);

  function writeSelection(food: string | null, regionCode: string | null) {
    const next = foodSelectionParams(new URLSearchParams(window.location.search), { food, regionCode }).toString();
    if (next === window.location.search.replace(/^\?/, "")) return;
    window.history.pushState(null, "", `${window.location.pathname}${next ? `?${next}` : ""}`);
  }
  function selectFood(id: string) {
    gridScroll.current = window.scrollY;
    lastTile.current = id;
    writeSelection(id, null);
  }
  function clearFood() {
    writeSelection(null, null);
  }

  // 음식을 풀면 격자 스크롤 위치를 되돌리고 방금 누른 타일로 포커스를 돌려 준다.
  useLayoutEffect(() => {
    if (selectedFood) { hadFood.current = true; return; }
    if (!hadFood.current) return;
    hadFood.current = false;
    if (gridScroll.current !== null) window.scrollTo(0, gridScroll.current);
    const tile = lastTile.current ? document.querySelector<HTMLElement>(`[data-food-id="${lastTile.current}"] button`) : null;
    tile?.focus({ preventScroll: true });
  }, [selectedFood]);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tabIdPrefix = useId();
  const panelId = useId();

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
      for (const season of food.seasons) stats[season].total += 1;
      if (isCollected) {
        stats.all.collected += 1;
        for (const season of food.seasons) stats[season].collected += 1;
      }
    }

    return stats;
  }, [collectedSet]);

  const filteredFoods = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    return SEASONAL_FOODS.filter((food) => {
      if (selectedSeason !== "all" && !food.seasons.includes(selectedSeason)) {
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
        food.description,
        ...food.regions.flatMap((region) => [region.name, region.reason]),
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

  // 계절 탭 방향키(←/→/Home/End) 이동 및 포커스 동기화
  const handleTabKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    const count = SEASON_TABS.length;
    let nextIndex: number | null = null;

    if (event.key === "ArrowRight") {
      nextIndex = (index + 1) % count;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (index - 1 + count) % count;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = count - 1;
    }

    if (nextIndex === null) return;

    event.preventDefault();
    const nextTab = SEASON_TABS[nextIndex];
    if (nextTab) {
      setSelectedSeason(nextTab.key);
      tabRefs.current[nextIndex]?.focus();
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 md:px-8 md:py-12">
      {selectedFood && (
        <FoodDetail
          key={selectedFood.id}
          food={selectedFood}
          regionCode={selection.regionCode}
          onSelectRegion={(code) => writeSelection(selectedFood.id, code)}
          onBack={clearFood}
        />
      )}
      <div hidden={selectedFood !== null} className={selectedFood ? "hidden" : "flex flex-col gap-6"}>
      {/* 1행: 1순위 페이지 제목 + 아담한 보조 검색창(h-9, 14px) */}
      <header className="flex flex-col gap-4">
        <h1 className="sr-only">제철음식 도감</h1>

        <form
          role="search"
          onSubmit={(event) => event.preventDefault()}
          className="flex h-11 w-full items-center gap-2 rounded-input bg-surface/40 px-3 shadow-[inset_0_0_0_1px_var(--color-line)] transition-colors focus-within:bg-surface/90 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent sm:w-52"
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
              className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted hover:text-foreground focus-ring"
            >
              <Icon name="close" size={14} />
            </button>
          )}
        </form>
      </header>

      {/* 2행: 흰 표면 카드(shadow-card 단일 경계)로 감싼 수집 진행도 */}
      <section aria-label="제철음식 수집 현황">
        <div className="rounded-card border border-line bg-surface px-5 py-4">
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
      <section className="flex flex-col gap-4 sm:gap-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:border-b sm:border-line">
          <div
            className="flex items-center gap-5 overflow-x-auto border-b border-line sm:gap-6 sm:overflow-visible sm:border-b-0"
            role="tablist"
            aria-label="계절 필터"
          >
            {SEASON_TABS.map((tab, index) => {
              const active = selectedSeason === tab.key;

              return (
                <button
                  key={tab.key}
                  ref={(el) => {
                    tabRefs.current[index] = el;
                  }}
                  id={`${tabIdPrefix}-${tab.key}`}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-controls={panelId}
                  tabIndex={active ? 0 : -1}
                  onClick={() => setSelectedSeason(tab.key)}
                  onKeyDown={(event) => handleTabKeyDown(event, index)}
                  className={
                    "relative inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center px-0.5 text-sm whitespace-nowrap transition-colors focus-ring " +
                    (active
                      ? "font-semibold text-foreground"
                      : "font-medium text-muted hover:text-foreground")
                  }
                >
                  <span>{tab.label}</span>
                  {active && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-accent sm:-bottom-px"
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="shrink-0 self-end sm:self-auto">
            <CollectionFilterDropdown
              value={collectionFilter}
              onChange={setCollectionFilter}
            />
          </div>
        </div>

        {/* 음식 ID 계약을 확인하기 전에는 식당 연결을 제공하지 않는다. */}
        <div
          id={panelId}
          role="tabpanel"
          aria-labelledby={`${tabIdPrefix}-${selectedSeason}`}
        >
          {filteredFoods.length === 0 ? (
            <div className="rounded-card border border-line bg-surface py-8">
              <EmptyState
                illustration="empty-search"
                message="고른 계절과 검색어에 맞는 제철음식이 없어요."
                action={
                  <ActionButton
                    variant="tinted"
                    size="sm"
                    onClick={resetFilters}
                  >
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

                return (
                  <li key={food.id} data-food-id={food.id}>
                    <div onClick={(e) => { if (!(e.target as Element).closest("button")) selectFood(food.id); }} className="flex h-full cursor-pointer flex-col gap-3 rounded-card border border-line bg-surface p-4">
                      <div className="rounded-input bg-illustration-surface py-4">
                        <FoodTile name={food.name} src={food.src} collected={isCollected} imageSize={76} showName={false} onSelect={() => selectFood(food.id)} />
                      </div>
                      <p aria-hidden="true" className={`type-row font-semibold ${isCollected ? "text-foreground" : "text-muted"}`}>{food.name}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
      </div>
    </main>
  );
}
