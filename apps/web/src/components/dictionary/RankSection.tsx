"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Icon } from "@/components/icon/Icon";
import { RankLadder } from "@/components/rank/RankLadder";
import { RankProgress } from "@/components/rank/RankProgress";
import { rankOf } from "@/lib/rank/ranks";

type Props = {
  reviewCount: number;
  /** 같은 카드 안에 함께 보여 줄 수집 진행도 */
  collection?: ReactNode;
};

/** 내 랭크 한 줄. 누르면 같은 화면 아래에 5단계 사다리가 펴진다(Esc·뒤로 가기로 닫는다). */
export function RankSection({ reviewCount, collection }: Props) {
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

  return (
    <section aria-label="내 도감과 랭크" onKeyDown={onKeyDown} className="rounded-card border border-line bg-surface px-4 py-3">
      <p className="type-caption text-muted">수집 현황과 랭크는 예시예요.</p>
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
