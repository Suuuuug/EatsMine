import Image from "next/image";
import { Icon } from "@/components/icon/Icon";

type AchievementBadgeProps = {
  id: string;
  name: string;
  earned: boolean;
};

/** 기록 배지. 받은 배지는 원색, 아직이면 흑백 + 자물쇠 + "아직" 글자(색만으로 구분하지 않는다). */
export function AchievementBadge({ id, name, earned }: AchievementBadgeProps) {
  return (
    <figure className="flex w-20 flex-col items-center gap-2 text-center">
      <span className="relative">
        <Image
          src={`/images/badges/${id}.svg`}
          alt=""
          width={64}
          height={64}
          className={earned ? "" : "opacity-45 grayscale"}
        />
        {!earned && (
          <span className="absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full bg-surface text-muted ring-1 ring-line">
            <Icon name="lock" size={14} />
          </span>
        )}
      </span>
      <figcaption className="flex flex-col">
        <span className={`type-caption ${earned ? "text-foreground" : "text-muted"}`}>{name}</span>
        {!earned && <span className="text-xs text-muted">아직</span>}
      </figcaption>
    </figure>
  );
}
