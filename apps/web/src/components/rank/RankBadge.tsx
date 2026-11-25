import Image from "next/image";
import { RANKS, type RankId } from "@/lib/rank/ranks";

type RankBadgeProps = {
  rank: RankId;
  size?: 24 | 32 | 48 | 96;
  /** true면 티어 이름을 화면에서 숨기고 스크린리더에만 읽힌다 */
  hideName?: boolean;
  className?: string;
};

/** 랭크 이미지는 장식(alt="")이고 티어 이름 글자가 의미를 전한다. */
export function RankBadge({ rank, size = 32, hideName = false, className = "" }: RankBadgeProps) {
  const info = RANKS.find((r) => r.id === rank) ?? RANKS[0];
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Image src={info.src} alt="" width={size} height={size} className="shrink-0" />
      <span className={hideName ? "sr-only" : "type-body font-medium text-foreground"}>{info.name}</span>
    </span>
  );
}
