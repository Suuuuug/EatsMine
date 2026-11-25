"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActionButton, EmptyState, IconButton, actionButtonClass } from "@/components/em";
import { TerritoryMap } from "@/components/em/TerritoryMap";
import { GlassCard } from "@/components/ui";
import type { ApiRankingEntry, NormalizedRegionRanking } from "@/lib/dictionary/dictionary-api";
import { getTravelProvinceName } from "@/lib/seo/site";
import { countLeading, standingLine } from "@/lib/territory/my-standing";
import regionCodes from "../../../public/images/maps/region-codes.json";

type Visited = { code: string; label: string };
type RankingState = NormalizedRegionRanking | "loading" | "error";

const provinceNames = new Map(regionCodes.provinces.map((p) => [p.code, getTravelProvinceName(p.code, p.name)]));

/**
 * 미리 불러오는 다녀온 지역 순위 수와 동시 요청 수. 순위 API는 IP당 분당 60회라(도감과 같은 한도)
 * 적게, 나눠서 부른다. 넘는 지역은 고를 때 불러온다.
 */
const PRELOAD_LIMIT = 10;
const CONCURRENCY = 3;

/*
 * 내 영토 상세. 고르기 전에는 내 영토 요약(다녀온 곳, 1위인 지역, 남긴 후기)을,
 * 지역을 고르면 그 지역 최근 30일 순위와 1위까지 남은 후기 수를 보여 준다.
 * 데이터는 props로만 받는다. 순위는 loadRanking이 서버(또는 예시)에서 가져온다.
 */
export function TerritoryExplorer({
  visited,
  reviewCount,
  loadRanking,
}: {
  visited: readonly Visited[];
  /** 내가 남긴 후기 수(공개·나만 보기 모두) */
  reviewCount: number;
  loadRanking: (code: string) => Promise<NormalizedRegionRanking>;
}) {
  const [selected, setSelected] = useState<{ code: string; name: string } | null>(null);
  const [rankings, setRankings] = useState<ReadonlyMap<string, RankingState>>(new Map());
  const detailRef = useRef<HTMLElement>(null);

  const fetchRanking = useCallback(
    (code: string) => {
      setRankings((current) => new Map(current).set(code, "loading"));
      return loadRanking(code).then(
        (ranking) => setRankings((current) => new Map(current).set(code, ranking)),
        () => setRankings((current) => new Map(current).set(code, "error")),
      );
    },
    [loadRanking],
  );

  // 한 번 요청한 지역은 다시 부르지 않는다(토큰이 갱신돼 loadRanking이 바뀌어도).
  const requested = useRef(new Set<string>());
  useEffect(() => {
    const queue = visited.slice(0, PRELOAD_LIMIT).map((v) => v.code).filter((code) => !requested.current.has(code));
    queue.forEach((code) => requested.current.add(code));
    const worker = async () => {
      for (let code = queue.shift(); code; code = queue.shift()) await fetchRanking(code);
    };
    for (let i = 0; i < CONCURRENCY; i += 1) void worker();
  }, [visited, fetchRanking]);

  function choose(picked: { code: string; name: string }) {
    // 지도는 "중구"처럼 시·군·구 이름만 준다. 같은 이름이 여러 곳이라 시·도 이름을 붙인다.
    const label =
      visited.find((v) => v.code === picked.code)?.label ??
      `${provinceNames.get(picked.code.slice(0, 2)) ?? ""} ${picked.name}`.trim();
    const next = { code: picked.code, name: label };
    setSelected(next);
    if (!rankings.has(next.code) || rankings.get(next.code) === "error") {
      requested.current.add(next.code);
      void fetchRanking(next.code);
    }
    // 휴대폰에서는 목록이 아래에 있어 결과가 화면 밖에 뜬다. 결과가 보이도록 옮긴다.
    requestAnimationFrame(() => detailRef.current?.scrollIntoView({ block: "nearest" }));
  }

  const loaded = new Map<string, NormalizedRegionRanking | null>();
  for (const v of visited) {
    const r = rankings.get(v.code);
    loaded.set(v.code, r && typeof r === "object" ? r : null);
  }
  const preloading = visited.slice(0, PRELOAD_LIMIT).some((v) => rankings.get(v.code) === "loading" || !rankings.has(v.code));
  // 못 불러온 지역(실패·미리 부르지 않은 지역)이 있으면 1위 지역 수를 단정하지 않는다.
  const leadingKnown = visited.every((v) => loaded.get(v.code) != null);
  const leading = countLeading(loaded);
  const selectedRanking = selected ? rankings.get(selected.code) : undefined;

  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-8 2xl:grid-cols-[minmax(0,1fr)_26rem]">
      <GlassCard className="order-2 p-4 lg:order-none lg:p-6">
        <TerritoryMap
          territoryView
          visited={visited.map((v) => v.code)}
          selectedCode={selected?.code ?? null}
          onSelectTerritory={choose}
        />
      </GlassCard>

      <div className="contents lg:flex lg:flex-col lg:gap-6">
        <section ref={detailRef} aria-labelledby="territory-detail" className="order-1 flex scroll-mt-4 flex-col gap-1 lg:order-none">
          <div className="flex min-h-11 items-center justify-between gap-2">
            <h2 id="territory-detail" tabIndex={-1} className="type-section outline-none">
              {selected ? selected.name : visited.length > 0 ? `${visited.length}곳을 다녀왔어요` : "아직 다녀온 곳이 없어요"}
            </h2>
            {selected && (
              <IconButton
                icon="close"
                label="내 영토 요약으로"
                variant="plain"
                onClick={() => {
                  setSelected(null);
                  // 닫기 버튼이 사라지므로 요약 제목으로 포커스를 옮긴다.
                  requestAnimationFrame(() => document.getElementById("territory-detail")?.focus());
                }}
              />
            )}
          </div>

          {!selected && visited.length === 0 ? (
            <GlassCard>
              <EmptyState
                illustration="empty-visits"
                message="후기를 남기면 그 지역이 내 영토로 칠해져요"
                action={<Link href="/" className={actionButtonClass({ variant: "tinted" })}>후기 남길 식당 찾기</Link>}
              />
            </GlassCard>
          ) : !selected ? (
            <GlassCard className="px-4 py-2">
              <dl className="flex flex-col">
                <StatRow label="1위인 지역" value={preloading ? "세는 중이에요" : leadingKnown ? `${leading}곳` : `${leading}곳 이상`} />
                <StatRow label="남긴 후기" value={`${reviewCount}개`} last />
              </dl>
            </GlassCard>
          ) : (
            <div className="flex flex-col gap-3">
              <GlassCard className="flex flex-col px-4 py-3">
                <RankingBody
                  state={selectedRanking}
                  onRetry={() => fetchRanking(selected.code)}
                />
              </GlassCard>
              {/* 주 행동 하나. 순위를 보고 바로 누르도록 순위 카드 바로 아래 둔다. */}
              <Link href={`/?region=${encodeURIComponent(selected.code)}`} className={actionButtonClass({ size: "lg", block: true })}>
                이 지역 식당 보기
              </Link>
            </div>
          )}
        </section>

        {visited.length > 0 && (
          <section aria-labelledby="visited-title" className="order-3 flex flex-col gap-1 lg:order-none">
            <div className="flex min-h-11 items-center">
              <h2 id="visited-title" className="type-section">다녀온 곳</h2>
            </div>
            <GlassCard className="p-2">
              <ul className="flex flex-col">
                {visited.map((v) => {
                  const position = loaded.get(v.code)?.me?.position;
                  const active = selected?.code === v.code;
                  return (
                    <li key={v.code}>
                      <button
                        type="button"
                        aria-pressed={active}
                        onClick={() => choose({ code: v.code, name: v.label })}
                        className={
                          "pressable focus-ring flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 rounded-button px-2 text-left type-body " +
                          (active ? "bg-accent-weak font-semibold" : "hover:bg-fill")
                        }
                      >
                        <span className="min-w-0 truncate">{v.label}</span>
                        <span className={"shrink-0 tabular-nums " + (position === 1 ? "font-semibold text-accent-dark" : "text-foreground")}>
                          {position ? `${position}위` : ""}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </GlassCard>
          </section>
        )}
      </div>
    </div>
  );
}

function StatRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={"flex min-h-11 items-center justify-between gap-3 " + (last ? "" : "border-b border-line")}>
      <dt className="type-body">{label}</dt>
      <dd className="type-row font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function RankingBody({ state, onRetry }: { state: RankingState | undefined; onRetry: () => void }) {
  if (!state || state === "loading") {
    return <p role="status" className="flex min-h-11 items-center type-body">순위를 불러오는 중이에요</p>;
  }
  if (state === "error") {
    return (
      <div role="alert" className="flex min-h-11 items-center justify-between gap-3">
        <p className="type-body">순위를 불러오지 못했어요</p>
        <ActionButton variant="tinted" size="sm" onClick={onRetry}>다시 불러오기</ActionButton>
      </div>
    );
  }
  const rows: ApiRankingEntry[] = [...state.items];
  if (state.me && !rows.some((r) => r.isMe)) rows.push(state.me);
  return (
    <>
      <p aria-live="polite" className="type-row font-semibold text-accent-dark">{standingLine(state)}</p>
      {rows.length > 0 && (
        <>
          <h3 className="mt-3 type-caption text-foreground">최근 {state.windowDays}일 순위</h3>
          <ol className="mt-1 flex flex-col">
            {rows.map((row, i) => (
              <li
                key={`${row.position}-${row.nickname}`}
                className={
                  "flex min-h-11 items-center gap-3 rounded-button px-2 -mx-2 " +
                  (row.isMe ? "bg-accent-weak font-semibold" : "") +
                  (i > 0 && !row.isMe && !rows[i - 1].isMe ? " border-t border-line" : "")
                }
              >
                <span className="w-8 shrink-0 tabular-nums">{row.position}위</span>
                <span className="min-w-0 flex-1 truncate">
                  {row.nickname}
                  {row.isMe && <span className="ml-1.5 text-accent-dark">나</span>}
                </span>
                <span className="shrink-0 tabular-nums">후기 {row.reviewCount}개</span>
              </li>
            ))}
          </ol>
        </>
      )}
    </>
  );
}
