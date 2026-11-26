"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Skeleton } from "@/components/em";
import { Icon } from "@/components/icon/Icon";
import { MIN_PLACE_QUERY, normalizeQuery, type PlaceResult } from "@/lib/map/place-search";
import type { RegionItem } from "@/types/map";
import { usePlaceSearch } from "./usePlaceSearch";

type MapSearchBoxProps = {
  query: string;
  onQueryChange: (query: string) => void;
  /** 입력한 말과 맞는 시·군·구(화면에서 바로 거른 것, 최대 10개) */
  regions: readonly RegionItem[];
  /** 우리가 다루는 시·군·구 코드. 장소를 이 지역으로 바꿀 수 있는지 가리는 데 쓴다. */
  knownRegionCodes: ReadonlySet<string>;
  onSelectRegion: (region: RegionItem) => void;
  onSelectPlace: (place: PlaceResult) => void;
};

type Option = { id: string; kind: "region"; region: RegionItem } | { id: string; kind: "place"; place: PlaceResult };

/**
 * 지역과 장소(역·랜드마크)를 한 칸에서 찾는 검색 상자. 목록도 하나다.
 * 시·군·구가 먼저, 그 아래 장소. 고르면 바로 그 지역으로 이동한다(확인 버튼·탭 없음).
 * 장소 검색이 안 돼도 지역 결과는 그대로 보인다.
 */
export function MapSearchBox({ query, onQueryChange, regions, knownRegionCodes, onSelectRegion, onSelectPlace }: MapSearchBoxProps) {
  const baseId = useId();
  const listId = `${baseId}-list`;
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [composing, setComposing] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const places = usePlaceSearch(query, knownRegionCodes, composing);

  const trimmed = normalizeQuery(query);
  const options: Option[] = [
    ...regions.map((region): Option => ({ id: `${baseId}-r-${region.code}`, kind: "region", region })),
    ...places.places.map((place): Option => ({ id: `${baseId}-p-${place.id}`, kind: "place", place })),
  ];
  const visible = open && trimmed !== "";
  const searchingPlaces = trimmed.length >= MIN_PLACE_QUERY;
  const nothing = options.length === 0 && (!searchingPlaces || places.status === "ready" || places.status === "error");
  const active = options[Math.min(index, Math.max(options.length - 1, 0))];

  // 검색창 바깥을 누르면 목록을 닫는다
  useEffect(() => {
    if (!open) return;
    const outside = (event: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, [open]);

  function pick(option: Option | undefined) {
    if (!option) return;
    setOpen(false);
    if (option.kind === "region") onSelectRegion(option.region);
    else onSelectPlace(option.place);
  }

  return (
    <div ref={boxRef} className="relative min-w-0 flex-1">
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          pick(active);
        }}
        className="flex h-11 w-full items-center gap-2 rounded-input border border-line bg-surface/75 px-3 transition-colors focus-within:bg-surface focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent"
      >
        <Icon name="search" size={16} className="shrink-0 text-muted" />
        <input
          type="search"
          role="combobox"
          aria-expanded={visible}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={visible && active ? active.id : undefined}
          aria-label="지역이나 장소 검색"
          placeholder="지역, 역, 장소 이름"
          enterKeyHint="search"
          autoComplete="off"
          value={query}
          onChange={(event) => {
            onQueryChange(event.target.value);
            setIndex(0);
            setOpen(event.target.value.trim() !== "");
          }}
          onFocus={() => {
            if (trimmed) setOpen(true);
          }}
          onCompositionStart={() => setComposing(true)}
          onCompositionEnd={() => setComposing(false)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              return;
            }
            if (!visible || options.length === 0) return;
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setIndex((current) => (current + 1) % options.length);
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setIndex((current) => (current - 1 + options.length) % options.length);
            }
          }}
          className="min-w-0 flex-1 bg-transparent type-body text-foreground outline-none placeholder:text-muted/80 [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            type="button"
            aria-label="검색어 지우기"
            onClick={() => {
              onQueryChange("");
              setOpen(false);
            }}
            className="relative inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted before:absolute before:-inset-1.5 before:content-[''] hover:text-foreground focus-ring"
          >
            <Icon name="close" size={14} />
          </button>
        )}
      </form>

      {visible && (
        <div id={listId} role="listbox" aria-label="검색 결과" className="material-thick absolute inset-x-0 top-full z-40 mt-1.5 max-h-80 overflow-y-auto rounded-input p-1">
          {options.map((option, i) => {
            const selected = option === active;
            return (
              <button
                key={option.id}
                id={option.id}
                type="button"
                role="option"
                aria-selected={selected}
                tabIndex={-1}
                onMouseEnter={() => setIndex(i)}
                onClick={() => pick(option)}
                className={
                  "flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-button px-3 py-2 text-left transition-colors " +
                  (selected ? "bg-accent-weak" : "hover:bg-fill")
                }
              >
                <Icon name={option.kind === "region" ? "map" : "pin"} size={24} className="shrink-0 text-accent-dark" />
                {option.kind === "region" ? (
                  <span className="min-w-0 truncate type-body">{option.region.fullName}</span>
                ) : (
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate type-body">{option.place.name}</span>
                    <span className="truncate type-caption font-normal text-muted">{option.place.address}</span>
                  </span>
                )}
              </button>
            );
          })}

          {searchingPlaces && places.status === "loading" && (
            // 결과 행과 같은 모양으로 자리를 잡는다(TDS Skeleton: 콘텐츠 구조를 미리 보여 줌)
            <div aria-hidden="true" className="flex min-h-11 items-center gap-3 px-3 py-2">
              <Skeleton className="size-6 shrink-0 rounded-full" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-4 w-2/5" />
                <Skeleton className="h-3.5 w-3/5" />
              </div>
            </div>
          )}
          {places.status === "error" && (
            <div role="status" className="flex flex-col items-start gap-1 px-3 py-3">
              <p className="type-body">
                {options.length > 0 ? "장소 검색이 잠깐 안 돼요. 지역 이름으로는 계속 찾을 수 있어요" : "장소 검색이 잠깐 안 돼요. 다시 시도하거나 지역 이름으로 찾아보세요"}
              </p>
              <button type="button" onClick={places.retry} className="pressable focus-ring -ml-2 inline-flex min-h-11 cursor-pointer items-center rounded-button px-2 type-row font-medium text-accent-dark">
                다시 시도하기
              </button>
            </div>
          )}
          {nothing && places.status !== "error" && (
            // 없다고만 하지 않고 무엇으로 찾을 수 있는지 함께 알린다(토스: 부정형은 이유·방법과 함께)
            <p role="status" className="px-3 py-3 type-body">
              맞는 곳이 없어요. 지역, 역, 장소 이름으로 다시 찾아보세요
            </p>
          )}
          <p aria-live="polite" className="sr-only">
            {options.length > 0 ? `검색 결과 ${options.length}개` : ""}
          </p>
        </div>
      )}
    </div>
  );
}
