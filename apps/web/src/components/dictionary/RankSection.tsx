"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Icon } from "@/components/icon/Icon";
import { RankLadder } from "@/components/rank/RankLadder";
import { RankProgress } from "@/components/rank/RankProgress";
import { rankOf } from "@/lib/rank/ranks";

export type RankSectionStatus =
  | "sample"
  | "live"
  | "loading"
  | "unauthorized"
  | "error";

type Props = {
  reviewCount: number;
  /** 내 도감·랭크 데이터 상태 (비로그인 예시 / 실데이터 / 로딩 / 인증 만료 / 조회 실패) */
  status?: RankSectionStatus;
  /** 조회 실패·인증 만료 시 재시도 콜백 */
  onRetry?: () => void;
  /** 같은 카드 안에 함께 보여 줄 수집 진행도 */
  collection?: ReactNode;
};

/** 내 랭크 한 줄. 누르면 같은 화면 아래에 5단계 사다리가 펴진다(Esc·뒤로 가기로 닫는다). */
export function RankSection({
  reviewCount,
  status = "sample",
  onRetry,
  collection,
}: Props) {
  const [open, setOpen] = useState(false);
  const pushed = useRef(false);
  const panelId = useId();
  const rank = rankOf(reviewCount);

  useEffect(() => {
    function onPop() {
      pushed.current = false;
      setOpen(false);
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  function toggle() {
    if (!open) {
      window.history.pushState({ ...window.history.state, emRankOpen: true }, "", window.location.href);
      pushed.current = true;
      setOpen(true);
    } else close();
  }
  function close() {
    // 랭크를 연 항목이 지금 이력 위치일 때만 뒤로 가기로 닫는다. 그 사이 다른 화면으로 이동했다면 상태만 닫는다.
    if (pushed.current && window.history.state?.emRankOpen) window.history.back();
    else {
      pushed.current = false;
      setOpen(false);
    }
  }
  function onKeyDown(e: KeyboardEvent<HTMLElement>) {
    if (e.key === "Escape" && open) {
      e.stopPropagation();
      close();
    }
  }

  if (status === "loading") {
    return (
      <section
        aria-label="내 도감과 랭크"
        aria-busy="true"
        className="rounded-card border border-line bg-surface px-4 py-4"
      >
        <p role="status" className="type-body text-muted">
          내 수집 현황과 랭크를 불러오는 중이에요.
        </p>
      </section>
    );
  }

  if (status === "unauthorized") {
    return (
      <section
        aria-label="내 도감과 랭크"
        className="flex flex-col gap-3 rounded-card border border-line bg-surface px-4 py-4"
      >
        <p role="alert" className="type-body text-foreground">
          로그인이 만료됐어요. 다시 로그인해 주세요.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/login?next=/dictionary"
            className="pressable inline-flex min-h-11 items-center rounded-button bg-accent px-4 type-caption font-semibold text-on-accent focus-ring"
          >
            다시 로그인
          </Link>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="pressable inline-flex min-h-11 items-center rounded-button bg-fill px-4 type-caption font-semibold text-foreground focus-ring"
            >
              다시 확인
            </button>
          )}
        </div>
      </section>
    );
  }

  if (status === "error") {
    return (
      <section
        aria-label="내 도감과 랭크"
        className="flex flex-col gap-3 rounded-card border border-line bg-surface px-4 py-4"
      >
        <p role="alert" className="type-body text-foreground">
          내 수집 현황과 랭크를 불러오지 못했어요. 다시 시도해 주세요.
        </p>
        {onRetry && (
          <div>
            <button
              type="button"
              onClick={onRetry}
              className="pressable inline-flex min-h-11 items-center rounded-button bg-fill px-4 type-caption font-semibold text-foreground focus-ring"
            >
              다시 불러오기
            </button>
          </div>
        )}
      </section>
    );
  }

  return (
    <section aria-label="내 도감과 랭크" onKeyDown={onKeyDown} className="rounded-card border border-line bg-surface px-4 py-3">
      {status === "sample" && (
        <p className="type-caption text-muted">로그인 전이라 수집 현황과 랭크는 예시예요.</p>
      )}
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
        className="pressable flex min-h-14 w-full items-center gap-3 rounded-button text-left focus-ring"
      >
        <Image src={rank.src} alt="" width={48} height={48} className="shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block type-row font-semibold">{rank.name}</span>
          <span className="block type-caption text-muted tabular-nums">내 리뷰 {reviewCount}개</span>
        </span>
        <span className="flex shrink-0 items-center gap-1 type-caption font-semibold text-accent-dark">
          랭크 보기
          <Icon name="chevron-right" size={16} className={open ? "rotate-90" : ""} />
        </span>
      </button>
      <div className="mt-1 flex flex-col gap-2">
        {collection}
      </div>
      <div id={panelId} hidden={!open} className="mt-4 flex flex-col gap-3 border-t border-line pt-4">
        <RankProgress reviewCount={reviewCount} />
        <RankLadder reviewCount={reviewCount} />
        <p className="type-caption text-muted">리뷰는 직접 다녀온 곳에만 써 주세요.</p>
      </div>
    </section>
  );
}
