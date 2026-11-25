"use client";

import Image from "next/image";
import { Icon } from "@/components/icon/Icon";
import { ActionButton } from "@/components/em";
import type { TerritoryOwner } from "@/types/territory";
import { myRank, type ScopeSummary } from "@/lib/territory/owner-view";

type OwnerDetailProps = {
  /** 지금 보는 범위(전국 또는 광역시·도) 이름과 요약 */
  scopeName: string;
  summary: ScopeSummary;
  /** 목록에서 고른 지역. 없으면 범위 요약을 보여 준다. */
  selected: { regionName: string; owner: TerritoryOwner | null } | null;
  meId: string | null;
  onBack: () => void;
  onViewRestaurants: () => void;
};

/** 선택한 지역의 1위와 상위 3위. 모달이 아니라 지도 옆·아래 패널로 둔다. */
export function OwnerDetail({ scopeName, summary, selected, meId, onBack, onViewRestaurants }: OwnerDetailProps) {
  if (!selected) {
    return (
      <section aria-label={`${scopeName} 요약`} className="rounded-card border border-line bg-surface p-4">
        <h2 className="type-section">{scopeName}</h2>
        {summary.topPerson ? (
          <>
            <p className="mt-3 flex items-center gap-2 type-body">
              <Icon name="review" size={20} className="shrink-0 text-accent-dark" />
              전체 리뷰 {summary.totalReviews}개
            </p>
            <p className="mt-3 type-caption font-semibold">지금까지 리뷰를 가장 많이 남긴 사람</p>
            <p className="flex items-center justify-between gap-3 type-body font-semibold">
              <span className="min-w-0 truncate">{summary.topPerson.nickname}{summary.topPerson.ownerId === meId && <Icon name="check" size={16} className="ml-1 inline text-accent-dark" />}</span>
              <span className="shrink-0 tabular-nums">리뷰 {summary.topPerson.reviewCount}개</span>
            </p>
          </>
        ) : <p className="mt-3 type-body">아직 리뷰가 없어요</p>}
      </section>
    );
  }
  const { regionName, owner } = selected;
  const mine = myRank(owner, meId);
  const podium = owner ? [owner, ...(owner.top ?? [])] : [];
  return (
    <section aria-label={`${regionName} 영토 주인`} className="rounded-card border border-line bg-surface p-4">
      <button type="button" onClick={onBack} className="pressable focus-ring -ml-2 min-h-11 rounded-input px-2 font-semibold text-accent-dark">‹ {scopeName}</button>
      <h2 className="type-section">{regionName}</h2>
      {owner ? (
        <>
          <p className="mt-3 type-caption font-semibold">영토 주인</p>
          <p className="flex items-center gap-1 type-title">
            {owner.isMe && <span className="sr-only">내가 이 영토의 주인이에요. </span>}
            <Image src="/images/territory/owner-crown.svg" alt="" width={32} height={32} className="shrink-0" />
            <span className="min-w-0 truncate">{owner.nickname}</span>
          </p>
          <p className="mt-1 flex items-center gap-2 type-body">
            <Icon name="review" size={20} className="shrink-0 text-accent-dark" />
            이 지역 리뷰 {owner.reviewCount}개
          </p>
          {podium.length > 1 && (
            <div className="mt-4">
              <h3 className="flex items-center gap-2 type-row font-semibold">
                <Icon name="trophy" size={20} className="shrink-0 text-accent-dark" />상위 3위
              </h3>
              <ol className="mt-1 divide-y divide-line">
                {podium.map((person, index) => (
                  <li key={person.ownerId} className="flex min-h-11 items-center justify-between gap-3 py-2 type-body">
                    <span className="min-w-0 truncate"><span className="font-semibold">{index + 1}위</span> {person.nickname}{person.ownerId === meId && <Icon name="check" size={16} className="ml-1 inline text-accent-dark" />}</span>
                    <span className="shrink-0 tabular-nums">리뷰 {person.reviewCount}개</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          <p className="mt-3 type-body font-semibold">
            {mine ? (mine.rank === 1 ? "내가 이 영토의 주인이에요" : `이 지역에서 ${mine.rank}위예요. 주인까지 리뷰 ${Math.max(owner.reviewCount - mine.reviewCount, 1)}개 남았어요.`) : "이 지역 상위 3위에 아직 없어요"}
          </p>
        </>
      ) : <p className="mt-3 type-body">아직 주인이 없어요</p>}
      <ActionButton block className="mt-4" onClick={onViewRestaurants}>이 지역 식당 보기</ActionButton>
    </section>
  );
}
