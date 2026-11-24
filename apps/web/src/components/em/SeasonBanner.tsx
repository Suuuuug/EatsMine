import Image from "next/image";
import type { ReactNode } from "react";
import { seasonNames, type Season } from "@/lib/assets/catalog";

type SeasonBannerProps = {
  season: Season;
  /** 배너 위 제목. 예: "이번 겨울에 모을 음식" */
  title: string;
  action?: ReactNode;
  className?: string;
};

/**
 * 계절 그림 위에 유리 캡션 한 줄. 그림은 꾸밈이므로 alt를 비우고 글자로 뜻을 전한다.
 * 유리는 그림 위에 떠 있는 캡션에만 쓴다(HIG: 시각적으로 풍부한 배경 위에서만 맑은 유리).
 */
export function SeasonBanner({ season, title, action, className = "" }: SeasonBannerProps) {
  return (
    <section
      aria-label={`${seasonNames[season]} 배너`}
      className={`relative isolate flex aspect-[12/5] min-h-40 w-full items-end overflow-hidden rounded-card ${className}`}
    >
      <Image
        src={`/images/seasons/${season}.webp`}
        alt=""
        fill
        sizes="(min-width: 1024px) 720px, 100vw"
        className="-z-10 object-cover"
      />
      <div className="glass-bar m-3 flex w-[calc(100%-1.5rem)] items-center justify-between gap-3 rounded-button px-4 py-3 shadow-[inset_0_0_0_1px_var(--color-line)]">
        <h3 className="type-row text-foreground">{title}</h3>
        {action}
      </div>
    </section>
  );
}
