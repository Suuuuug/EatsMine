import type { ReactNode } from "react";
import { GlassCard } from "./GlassCard";
import { StarRating } from "./StarRating";

type ReviewCardProps = {
  name: string;
  rating: number;
  content: string;
  /** 프로필 이미지 (next/image 등). 없으면 이름 첫 글자를 표시합니다. */
  avatar?: ReactNode;
  className?: string;
};

export function ReviewCard({ name, rating, content, avatar, className = "" }: ReviewCardProps) {
  return (
    <GlassCard className={`flex flex-col gap-6 p-7 ${className}`}>
      <div className="flex items-center gap-4">
        <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface text-xl font-semibold shadow-avatar">
          {avatar ?? name.charAt(0)}
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xl font-semibold text-foreground">{name}</p>
          <StarRating value={rating} size={14} />
        </div>
      </div>
      <p className="text-base text-muted">{content}</p>
    </GlassCard>
  );
}
