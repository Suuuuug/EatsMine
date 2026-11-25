"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { actionButtonClass, EmptyState, SkeletonRow, TerritoryMap } from "@/components/em";
import { Icon } from "@/components/icon/Icon";
import { RestaurantRow } from "@/components/map/RestaurantRow";
import {
  fetchFoodDetail,
  mergeFoodDetailWithApi,
  normalizeApiBase,
  paginateItems,
  recordOutboundEvent,
  type ApiTerritoryOwner,
} from "@/lib/dictionary/dictionary-api";
import {
  escapeAction,
  groupByProvince,
  resolveActiveProvince,
  resolveSelectedRegion,
  type Territory,
} from "@/lib/dictionary/food-region-selection";
import { useRestaurants } from "@/lib/map/use-restaurants";
import { getTravelProvinceName } from "@/lib/seo/site";
import type { SeasonalFoodItem } from "@/types/dictionary";
import { FoodRegionList } from "./FoodRegionList";
import { RegionLeaderboard } from "./RegionLeaderboard";

const apiBase = normalizeApiBase(process.env.NEXT_PUBLIC_API_URL);

type Props = {
  food: SeasonalFoodItem;
  /** URL의 regionCode(검증 전). */
  regionCode: string | null;
  /** GET /territories 실데이터 연결 여부 */
  territoryLive?: boolean;
  /** GET /territories 집계 기간(일) */
  territoryWindowDays?: number;
  /** GET /territories 영토 주인 맵 */
  territoryOwners?: Readonly<Record<string, ApiTerritoryOwner>>;
  /** 로그인 사용자의 프로필 ID */
  myUserId?: string | null;
  /** 로그인 사용자의 Bearer 토큰(지역 순위 내 위치 확인용) */
  accessToken?: string | null;
  onSelectRegion: (code: string | null) => void;
  onBack: () => void;
};

/** 음식을 고른 뒤의 화면: 왼쪽 지역·식당 목록, 오른쪽 영토 지도(좁은 화면은 지도 위, 목록 아래). */
export function FoodDetail({
  food,
  regionCode,
  territoryLive = false,
  territoryWindowDays = 30,
  territoryOwners = {},
  myUserId = null,
  accessToken = null,
  onSelectRegion,
  onBack,
}: Props) {
  const [liveDetail, setLiveDetail] = useState<SeasonalFoodItem | null>(null);
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [provinceNames, setProvinceNames] = useState<Record<string, string>>({});
  const [pickedProvince, setPickedProvince] = useState<string | null>(null);

  // 백엔드 GET /foods/:id 상세 정보(최신 설명·추천 산지·업종) 조회
  useEffect(() => {
    if (!apiBase || !food.apiId) return;
    const controller = new AbortController();
    fetchFoodDetail(apiBase, food.apiId, controller.signal)
      .then((detail) => {
        setLiveDetail(mergeFoodDetailWithApi(food, detail));
      })
      .catch(() => {
        // 실패 시 목록에서 전달된 기본 정보 유지
      });
    return () => controller.abort();
  }, [food]);

  const activeFood = liveDetail ?? food;

  useEffect(() => {
    const controller = new AbortController();
    fetch("/images/maps/region-codes.json", { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: { territories: Territory[]; provinces: { code: string; name: string }[] }) => {
        setTerritories(data.territories);
        setProvinceNames(
          Object.fromEntries(
            data.provinces.map((p) => [p.code, getTravelProvinceName(p.code, p.name)]),
          ),
        );
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  // 추천 지역을 시도별로 묶어 시도 순서대로 놓는다(목록 소제목과 큰 지도 전환의 기준).
  const groups = useMemo(
    () => groupByProvince(activeFood.regions.map((r) => r.code), territories),
    [activeFood.regions, territories],
  );
  const regions = useMemo(() => {
    if (territories.length === 0) return activeFood.regions;
    const byCode = new Map(activeFood.regions.map((r) => [r.code, r]));
    return groups.flatMap((g) => g.codes.map((c) => byCode.get(c)!));
  }, [activeFood.regions, territories, groups]);
  const codes = useMemo(() => regions.map((r) => r.code), [regions]);
  const multiProvince = groups.length > 1;
  const headings = useMemo(() => {
    if (!multiProvince) return undefined;
    return Object.fromEntries(
      groups.map((g) => [g.codes[0], provinceNames[g.provinceCode] ?? ""]),
    );
  }, [groups, multiProvince, provinceNames]);

  const selected = resolveSelectedRegion(regions, regionCode);
  const activeProvince = resolveActiveProvince(groups, selected, pickedProvince);
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
      if (prev && (!active || active === document.body)) {
        rows?.[regions.findIndex((r) => r.code === prev)]?.focus();
      }
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
    setPickedProvince(null);
    onSelectRegion(code);
  }

  function pickProvince(provinceCode: string) {
    if (!groups.some((g) => g.provinceCode === provinceCode)) return;
    setPickedProvince(provinceCode);
    // 다른 시도의 시군구가 열려 있으면 닫아 큰 지도와 목록이 어긋나지 않게 한다.
    if (
      selected &&
      !groups.find((g) => g.provinceCode === provinceCode)?.codes.includes(selected)
    ) {
      onSelectRegion(null);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLElement>) {
    if (e.key !== "Escape" || e.defaultPrevented) return;
    const action = escapeAction(
      { food: activeFood.id, regionCode: selected && regions.length > 1 ? selected : null },
      regions.length,
    );
    if (action === "clearRegion") onSelectRegion(null);
    else if (action === "clearFood") onBack();
  }

  const backButton = (
    <button
      type="button"
      onClick={onBack}
      className="pressable -ml-2 inline-flex h-11 items-center gap-1 self-start rounded-button pr-3 pl-1.5 type-body font-medium text-accent-dark focus-ring"
    >
      <Icon name="back" size={20} />
      도감으로
    </button>
  );

  return (
    <section
      aria-labelledby="food-detail-title"
      onKeyDown={onKeyDown}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1">
        {backButton}
        <h2
          id="food-detail-title"
          ref={headingRef}
          tabIndex={-1}
          className="type-title outline-none"
        >
          {activeFood.name}
        </h2>
        <p className="type-body text-foreground">제철 {activeFood.seasonLabel}</p>
        {activeFood.description && (
          <p className="type-caption text-muted">{activeFood.description}</p>
        )}
      </div>

      <p role="status" className="sr-only">
        {selected ? `${activeFood.name}, ${selectedName} 선택` : `${activeFood.name} 선택`}
      </p>

      {regions.length === 0 ? (
        <div className="rounded-card border border-line bg-surface">
          <EmptyState
            illustration="empty-search"
            message="추천 지역이 아직 없어요."
            action={
              <Link
                href="/"
                className={actionButtonClass({ variant: "tinted", size: "md" })}
              >
                지도에서 직접 찾기
              </Link>
            }
          />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(280px,380px)_minmax(0,1fr)] lg:items-start lg:gap-6">
          <div className="lg:col-start-2 lg:row-start-1 lg:sticky lg:top-20">
            <TerritoryMap
              visited={[]}
              highlighted={codes}
              {...(activeProvince
                ? { province: activeProvince, onProvinceChange: () => {} }
                : { territoryView: true })}
              selectedCode={selected}
              onSelectTerritory={({ code }) => {
                if (codes.includes(code)) {
                  setPickedProvince(null);
                  onSelectRegion(code);
                }
              }}
              className="[&>div:first-child]:hidden [&_ul]:hidden [&>div.relative]:max-h-[min(42vh,420px)] lg:[&>div.relative]:max-h-[min(58vh,520px)]"
            />
          </div>
          <div className="contents lg:col-start-1 lg:row-start-1 lg:flex lg:flex-col lg:gap-4">
            {multiProvince && (
              <div className="mx-auto w-full max-w-[180px] lg:mx-0 lg:max-w-[150px]">
                <TerritoryMap
                  visited={[]}
                  highlighted={codes}
                  province=""
                  onProvinceChange={pickProvince}
                  selectedCode={activeProvince}
                  className="[&>div:first-child]:hidden [&_ul]:hidden [&>p]:hidden [&>div.relative]:max-h-40"
                />
              </div>
            )}
            <div
              ref={listRef}
              className="min-w-0 overflow-hidden rounded-card border border-line bg-surface"
            >
              <FoodRegionList
                regions={regions}
                selectedCode={selected}
                onSelect={chooseFromList}
                headings={headings}
                activeHeading={
                  groups.find((g) => g.provinceCode === activeProvince)?.codes[0] ?? null
                }
              >
                {selected && (
                  <>
                    <RegionLeaderboard
                      regionCode={selected}
                      territoryLive={territoryLive}
                      windowDays={territoryWindowDays}
                      liveOwner={territoryOwners[selected] ?? null}
                      myUserId={myUserId}
                      accessToken={accessToken}
                    />
                    <RegionRestaurants
                      regionCode={selected}
                      foodId={activeFood.apiId ?? null}
                      foodName={activeFood.name}
                    />
                  </>
                )}
              </FoodRegionList>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

const RESTAURANTS_PER_PAGE = 5;

function RegionRestaurants({
  regionCode,
  foodId,
  foodName,
}: {
  regionCode: string;
  foodId: number | null;
  foodName: string;
}) {
  const [attempt, setAttempt] = useState(0);
  const [pageState, setPageState] = useState<{ key: string; page: number }>({
    key: "",
    page: 1,
  });
  const listTopRef = useRef<HTMLDivElement>(null);
  const { result, loading, error } = useRestaurants(regionCode, foodId, attempt);

  if (!apiBase) {
    return <p className="py-3 type-body">식당 정보 연결을 준비하고 있어요.</p>;
  }
  if (loading) {
    return (
      <div aria-busy="true">
        <p role="status" className="pt-3 type-body">
          식당을 찾고 있어요.
        </p>
        <div aria-hidden="true">
          <SkeletonRow />
          <SkeletonRow />
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div role="alert" className="flex flex-col items-start gap-2 py-3">
        <p className="type-body">{error}</p>
        <button
          type="button"
          onClick={() => setAttempt((n) => n + 1)}
          className="pressable min-h-11 rounded-button bg-fill px-4 type-body font-semibold focus-ring"
        >
          다시 불러오기
        </button>
      </div>
    );
  }
  if (!result || result.items.length === 0) {
    return (
      <p className="py-3 type-body">
        이 지역에서 찾은 식당이 없어요. 다른 지역을 골라 보세요.
      </p>
    );
  }

  const pageKey = `${regionCode}:${foodId ?? ""}:${result.items.length}`;
  const requestedPage = pageState.key === pageKey ? pageState.page : 1;
  const paged = paginateItems(
    result.items,
    requestedPage,
    RESTAURANTS_PER_PAGE,
  );

  const goToPage = (nextPage: number) => {
    setPageState({ key: pageKey, page: nextPage });
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    listTopRef.current?.scrollIntoView({
      block: "nearest",
      behavior: reduce ? "auto" : "smooth",
    });
  };

  const matchHint =
    result.matchedBy === "keyword"
      ? `${foodName} 관련 이름으로 찾은 식당이에요.`
      : result.matchedBy === "genre"
        ? `${foodName} 대표 업종의 인기 식당이에요.`
        : null;

  return (
    <div ref={listTopRef}>
      <div className="flex items-baseline justify-between gap-2 pt-3 pb-1">
        <p className="min-w-0 truncate type-caption text-muted">
          {matchHint ?? "추천 식당 목록이에요."}
        </p>
        <span className="shrink-0 type-caption text-muted tabular-nums">
          총 {result.items.length}곳
        </span>
      </div>
      <ul className="m-0 list-none p-0">
        {paged.items.map((p) => (
          <li key={p.id}>
            <RestaurantRow
              name={p.name}
              address={p.address}
              rankNational={p.rankNational}
              estimatedHours={p.estimatedHours}
              merUrl={p.merUrl}
              reviewSummary={p.reviewSummary ?? null}
              onOutboundClick={() =>
                recordOutboundEvent(apiBase, {
                  restaurantKey: p.id,
                  regionCode,
                  placement: "list",
                })
              }
            />
          </li>
        ))}
      </ul>

      {paged.totalPages > 1 && (
        <nav
          aria-label="식당 목록 페이지 이동"
          className="flex items-center justify-center gap-1 pt-3"
        >
          <button
            type="button"
            disabled={paged.page <= 1}
            aria-label="이전 페이지"
            onClick={() => goToPage(paged.page - 1)}
            className="pressable inline-flex size-9 items-center justify-center rounded-button text-foreground hover:bg-fill focus-ring disabled:cursor-not-allowed disabled:opacity-35"
          >
            <Icon name="back" size={16} />
          </button>

          {paged.pageNumbers.map((num) => {
            const active = num === paged.page;
            return (
              <button
                key={num}
                type="button"
                aria-current={active ? "page" : undefined}
                aria-label={`${num}페이지`}
                onClick={() => goToPage(num)}
                className={
                  "pressable inline-flex size-9 items-center justify-center rounded-button text-xs font-semibold tabular-nums transition-colors focus-ring " +
                  (active
                    ? "bg-accent text-on-accent"
                    : "text-muted hover:bg-fill hover:text-foreground")
                }
              >
                {num}
              </button>
            );
          })}

          <button
            type="button"
            disabled={paged.page >= paged.totalPages}
            aria-label="다음 페이지"
            onClick={() => goToPage(paged.page + 1)}
            className="pressable inline-flex size-9 items-center justify-center rounded-button text-foreground hover:bg-fill focus-ring disabled:cursor-not-allowed disabled:opacity-35"
          >
            <Icon name="chevron-right" size={16} />
          </button>
        </nav>
      )}

      <p className="py-3 type-caption text-muted">
        {result.source || "eat.pl 잇플 · BC카드 결제 데이터 기반"}
      </p>
    </div>
  );
}
