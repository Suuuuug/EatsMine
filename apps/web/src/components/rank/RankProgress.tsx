import { ProgressBar } from "@/components/em/ProgressBar";
import { progress } from "@/lib/rank/ranks";

type RankProgressProps = {
  reviewCount: number;
  className?: string;
};

/** 다음 랭크까지의 진행. 최고 랭크는 막대 없이 한 줄로 알린다. */
export function RankProgress({ reviewCount, className = "" }: RankProgressProps) {
  const p = progress(reviewCount);
  if (!p.next) {
    return <p className={`type-body font-medium text-foreground ${className}`}>가장 높은 랭크예요</p>;
  }
  const span = p.next.min - p.current.min;
  return (
    <ProgressBar
      className={className}
      label={`${p.next.name}까지 리뷰 ${p.remaining}개 남았어요`}
      value={span - p.remaining}
      max={span}
      unit="개"
    />
  );
}
