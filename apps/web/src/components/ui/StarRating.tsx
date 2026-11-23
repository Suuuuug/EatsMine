import { useId } from "react";

type StarRatingProps = {
  /** 0 ~ max, 0.5 단위로 반올림해 표시 */
  value: number;
  max?: number;
  size?: number;
  className?: string;
};

const STAR_PATH =
  "M9.5 0L11.6329 6.56434H18.535L12.9511 10.6213L15.084 17.1857L9.5 13.1287L3.91604 17.1857L6.04892 10.6213L0.464963 6.56434H7.36712L9.5 0Z";

export function StarRating({ value, max = 5, size = 16, className = "" }: StarRatingProps) {
  const id = useId();
  const rounded = Math.round(Math.min(Math.max(value, 0), max) * 2) / 2;

  return (
    <div role="img" aria-label={`별점 ${rounded}점 / ${max}점`} className={`flex gap-1.5 ${className}`}>
      {Array.from({ length: max }, (_, i) => {
        const fill = Math.min(Math.max(rounded - i, 0), 1); // 0, 0.5, 1
        const clipId = `${id}-star-${i}`;
        return (
          <svg key={i} aria-hidden="true" width={size} height={size} viewBox="0 0 19 18">
            <defs>
              <clipPath id={clipId}>
                <rect width={19 * fill} height="18" />
              </clipPath>
            </defs>
            <path d={STAR_PATH} fill="currentColor" className="text-foreground/20" />
            <path d={STAR_PATH} fill="currentColor" className="text-star" clipPath={`url(#${clipId})`} />
          </svg>
        );
      })}
    </div>
  );
}
