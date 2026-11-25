import { Icon } from "@/components/icon/Icon";
import { RankBadge } from "@/components/rank/RankBadge";
import { RANKS, rankOf } from "@/lib/rank/ranks";

type RankLadderProps = {
  reviewCount: number;
  /** vertical: 세로 목록, horizontal: 가로 줄 */
  direction?: "vertical" | "horizontal";
  className?: string;
};

/**
 * 5단계 전체. 현재 단계는 색 + 체크 + aria-current로 강조하고,
 * 아직 닿지 않은 단계는 흐리게 두고 "리뷰 N개부터"를 적는다.
 */
export function RankLadder({ reviewCount, direction = "vertical", className = "" }: RankLadderProps) {
  const current = rankOf(reviewCount);
  const currentIndex = RANKS.findIndex((r) => r.id === current.id);
  const layout = direction === "horizontal" ? "flex-row overflow-x-auto" : "flex-col";

  return (
    <ol className={`flex gap-2 ${layout} ${className}`}>
      {RANKS.map((r, i) => {
        const isCurrent = i === currentIndex;
        const reached = i <= currentIndex;
        return (
          <li
            key={r.id}
            aria-current={isCurrent ? "step" : undefined}
            className={`flex items-center gap-3 rounded-2xl px-3 py-2 ${
              isCurrent ? "bg-accent-weak ring-1 ring-accent" : ""
            } ${reached ? "" : "opacity-50"}`}
          >
            <RankBadge rank={r.id} size={32} />
            <span className="type-caption text-muted tabular-nums">
              {reached ? (isCurrent ? "지금 랭크" : "달성") : `리뷰 ${r.min}개부터`}
            </span>
            {isCurrent && <Icon name="check" size={16} />}
          </li>
        );
      })}
    </ol>
  );
}
