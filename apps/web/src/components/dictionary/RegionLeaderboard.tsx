"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icon/Icon";
import {
  fetchRegionRanking,
  normalizeApiBase,
  type ApiTerritoryOwner,
  type NormalizedRegionRanking,
} from "@/lib/dictionary/dictionary-api";
import { buildLeaderboard, myStanding, standingMessage } from "@/lib/territory/leaderboard";
import { ME_ID, getDummyOwner } from "@/lib/territory/sample-data";
import type { TerritoryOwner } from "@/types/territory";

const apiBase = normalizeApiBase(process.env.NEXT_PUBLIC_API_URL);

type Props = {
  regionCode: string;
  /** GET /territories 실데이터 연결 성공 여부 */
  territoryLive?: boolean;
  /** GET /territories 기준 집계 기간(일) */
  windowDays?: number;
  /** GET /territories 에서 조회한 해당 지역의 실제 영토 주인(랭킹 로딩/폴백용) */
  liveOwner?: ApiTerritoryOwner | null;
  /** 로그인 사용자의 프로필 ID (폴백 시 1~3위 내 본인 강조용) */
  myUserId?: string | null;
  /** 로그인 사용자의 Bearer 토큰 (GET /territories/:regionCode/ranking 내 순위 조회용) */
  accessToken?: string | null;
};

function toLiveTerritoryOwner(
  liveOwner: ApiTerritoryOwner,
  myUserId: string | null,
): TerritoryOwner {
  const firstId = liveOwner.ownerId || `${liveOwner.regionCode}-rank-1`;
  const top = (liveOwner.top ?? []).map((c, idx) => ({
    ownerId: c.ownerId || `${liveOwner.regionCode}-rank-${idx + 2}`,
    nickname: (c.nickname ?? c.ownerNickname ?? "").trim(),
    reviewCount: c.reviewCount,
  }));

  return {
    regionCode: liveOwner.regionCode,
    ownerId: firstId,
    nickname: liveOwner.ownerNickname,
    reviewCount: liveOwner.reviewCount,
    isMe: Boolean(myUserId && firstId === myUserId),
    ...(top.length > 0 ? { top } : {}),
  };
}

/**
 * 선택한 지역의 영토 주인 및 상위 3명 순위.
 * - 1순위: GET /territories/:regionCode/ranking (최근 30일 공개 후기 기준 Top 3 + 로그인 시 내 순위)
 * - 2순위(로딩/폴백): GET /territories 1위 영토 주인
 * - 3순위(백엔드 미연결 개발 모드): 예시 순위
 */
export function RegionLeaderboard({
  regionCode,
  territoryLive = false,
  windowDays = 30,
  liveOwner = null,
  myUserId = null,
  accessToken = null,
}: Props) {
  const rankingKey = `${regionCode}:${accessToken ?? ""}`;
  const [rankingLoad, setRankingLoad] = useState<{
    key: string;
    data: NormalizedRegionRanking;
  } | null>(null);

  useEffect(() => {
    if (!apiBase || !/^\d{5}$/.test(regionCode)) return;
    const controller = new AbortController();
    fetchRegionRanking(apiBase, regionCode, accessToken, controller.signal)
      .then((data) => {
        setRankingLoad({ key: rankingKey, data });
      })
      .catch(() => {
        // 실패 시 GET /territories 폴백 유지
      });
    return () => controller.abort();
  }, [regionCode, accessToken, rankingKey]);

  const liveRanking =
    rankingLoad?.key === rankingKey ? rankingLoad.data : null;

  // 1순위: GET /territories/:regionCode/ranking 실데이터
  if (liveRanking) {
    if (liveRanking.items.length === 0) {
      return (
        <div className="border-b border-line py-3">
          <h5 className="flex items-center gap-2 type-body font-semibold">
            <Icon name="trophy" size={20} className="shrink-0 text-accent-dark" />
            이 지역 순위
            <span className="ml-auto type-caption font-normal text-muted">
              최근 {liveRanking.windowDays}일
            </span>
          </h5>
          <p className="mt-1.5 type-caption text-muted">
            최근 {liveRanking.windowDays}일 공개 후기 기준 영토 주인이 아직 없어요. 첫 후기를 남겨 보세요.
          </p>
        </div>
      );
    }

    const message = standingMessage(liveRanking.standing);

    return (
      <div className="border-b border-line py-3">
        <h5 className="flex items-center gap-2 type-body font-semibold">
          <Icon name="trophy" size={20} className="shrink-0 text-accent-dark" />
          {liveRanking.items.length === 1 ? "이 지역 영토 주인" : "이 지역 순위"}
          <span className="ml-auto type-caption font-normal text-muted">
            최근 {liveRanking.windowDays}일
          </span>
        </h5>
        <ol className="m-0 mt-2 list-none p-0">
          {liveRanking.items.map((r) => (
            <li
              key={`${regionCode}-${r.position}-${r.nickname}`}
              className={`flex min-h-11 items-center gap-3 rounded-button px-2 ${r.isMe ? "bg-accent-weak" : ""}`}
            >
              <span className="w-9 shrink-0 type-body font-semibold tabular-nums">
                {r.position}위
              </span>
              <span className="min-w-0 flex-1 truncate type-body">
                {r.nickname}
                {r.position === 1 && <span className="sr-only"> 영토 주인</span>}
                {r.isMe && <span className="sr-only"> (나)</span>}
              </span>
              <span className="shrink-0 type-caption text-muted tabular-nums">
                <span className="max-sm:sr-only">이 지역 </span>리뷰 {r.reviewCount}개
              </span>
            </li>
          ))}
        </ol>
        {message && (
          <p className="mt-2 type-caption font-semibold text-accent-dark">
            {message}
          </p>
        )}
      </div>
    );
  }

  // 2순위: GET /territories 폴백 (랭킹 응답 대기 중이거나 랭킹 조회 실패 시)
  if (territoryLive) {
    if (!liveOwner) {
      return (
        <div className="border-b border-line py-3">
          <h5 className="flex items-center gap-2 type-body font-semibold">
            <Icon name="trophy" size={20} className="shrink-0 text-accent-dark" />
            이 지역 영토 주인
          </h5>
          <p className="mt-1.5 type-caption text-muted">
            최근 {windowDays}일 공개 후기 기준 영토 주인이 아직 없어요. 첫 후기를 남겨 보세요.
          </p>
        </div>
      );
    }

    const rows = buildLeaderboard(
      toLiveTerritoryOwner(liveOwner, myUserId),
      myUserId ?? "",
    );
    const message = standingMessage(myStanding(rows));

    return (
      <div className="border-b border-line py-3">
        <h5 className="flex items-center gap-2 type-body font-semibold">
          <Icon name="trophy" size={20} className="shrink-0 text-accent-dark" />
          {rows.length === 1 ? "이 지역 영토 주인" : "이 지역 순위"}
          <span className="ml-auto type-caption font-normal text-muted">
            최근 {windowDays}일
          </span>
        </h5>
        <ol className="m-0 mt-2 list-none p-0">
          {rows.map((r) => (
            <li
              key={r.ownerId}
              className={`flex min-h-11 items-center gap-3 rounded-button px-2 ${r.isMe ? "bg-accent-weak" : ""}`}
            >
              <span className="w-9 shrink-0 type-body font-semibold tabular-nums">
                {r.rank}위
              </span>
              <span className="min-w-0 flex-1 truncate type-body">
                {r.nickname}
                {r.rank === 1 && <span className="sr-only"> 영토 주인</span>}
                {r.isMe && <span className="sr-only"> (나)</span>}
              </span>
              <span className="shrink-0 type-caption text-muted tabular-nums">
                <span className="max-sm:sr-only">이 지역 </span>리뷰 {r.reviewCount}개
              </span>
            </li>
          ))}
        </ol>
        {message && (
          <p className="mt-2 type-caption font-semibold text-accent-dark">
            {message}
          </p>
        )}
      </div>
    );
  }

  // 백엔드 API 미연결(로컬 프리뷰 등)일 때만 기존 예시 순위 표시
  const rows = buildLeaderboard(getDummyOwner(regionCode), ME_ID);
  if (rows.length === 0) return null;
  const message = standingMessage(myStanding(rows));

  return (
    <div className="border-b border-line py-3">
      <h5 className="flex items-center gap-2 type-body font-semibold">
        <Icon name="trophy" size={20} className="shrink-0 text-accent-dark" />
        {rows.length === 1 ? "영토 주인 예시" : "이 지역 순위 예시"}
      </h5>
      <ol className="m-0 mt-2 list-none p-0">
        {rows.map((r) => (
          <li key={r.ownerId} className={`flex min-h-11 items-center gap-3 rounded-button px-2 ${r.isMe ? "bg-accent-weak" : ""}`}>
            <span className="w-9 shrink-0 type-body font-semibold tabular-nums">{r.rank}위</span>
            <span className="min-w-0 flex-1 truncate type-body">
              {r.nickname}
              {r.rank === 1 && <span className="sr-only"> 영토 주인</span>}
              {r.isMe && <span className="sr-only"> (나)</span>}
            </span>
            <span className="shrink-0 type-caption text-muted tabular-nums"><span className="max-sm:sr-only">이 지역 </span>리뷰 {r.reviewCount}개</span>
          </li>
        ))}
      </ol>
      {message && <p className="mt-2 type-caption font-semibold text-accent-dark">{message}</p>}
    </div>
  );
}
