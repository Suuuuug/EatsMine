import type { ReactNode } from "react";
import { GlassCard } from "./GlassCard";

type ItemCardProps = {
  title: string;
  description?: string;
  /** 상단 이미지 영역 (next/image 등). 카드 위로 살짝 튀어나오게 배치됩니다. */
  image?: ReactNode;
  /** 하단 영역 — 왼쪽 정보(가격·평점 등) */
  meta?: ReactNode;
  /** 하단 영역 — 오른쪽 액션(아이콘 버튼 등) */
  action?: ReactNode;
  className?: string;
};

/** 범용 카드 — 맛집 카드, 음식(도감) 카드 등에 사용 */
export function ItemCard({ title, description, image, meta, action, className = "" }: ItemCardProps) {
  return (
    <div className={`flex flex-col ${className}`}>
      {image && <div className="relative z-10 mx-auto -mb-16 aspect-square w-4/5 drop-shadow-2xl">{image}</div>}
      <GlassCard className={`flex flex-1 flex-col gap-3 px-6 pb-6 ${image ? "pt-20" : "pt-6"}`}>
        <h3 className="text-xl text-muted">{title}</h3>
        {description && <p className="text-sm text-muted">{description}</p>}
        {(meta || action) && (
          <div className="mt-auto flex items-center justify-between gap-4 pt-2">
            <div className="text-xl text-muted">{meta}</div>
            {action}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
