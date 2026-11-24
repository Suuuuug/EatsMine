import type { ButtonHTMLAttributes } from "react";
import { Icon } from "@/components/icon/Icon";

type FilterChipProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> & {
  selected: boolean;
  onSelectedChange: (selected: boolean) => void;
};

/**
 * 누르는 필터에만 쓰는 칩(DESIGN §1: 장식용 상태 칩 금지).
 * 고른 상태는 색 + 체크 + aria-pressed로 함께 보인다. 여러 개를 가로 스크롤 줄에 둔다.
 */
export function FilterChip({ selected, onSelectedChange, children, className = "", ...props }: FilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelectedChange(!selected)}
      className={
        // 보이는 높이 36px, 위아래 4px 투명 영역으로 누르는 영역 44px
        "relative inline-flex h-9 shrink-0 cursor-pointer items-center gap-1 rounded-full px-3.5 text-sm font-medium " +
        "before:absolute before:inset-x-0 before:-inset-y-1 before:content-[''] " +
        "transition-colors duration-150 focus-ring active:opacity-70 " +
        // SEED Chip: 여러 개가 함께 선택되므로 고른 상태도 주목도를 낮게(약한 강조 면 + 테두리 + 체크)
        (selected
          ? "bg-accent-weak text-foreground shadow-[inset_0_0_0_1.5px_var(--color-accent)]"
          : "bg-fill text-foreground") +
        ` ${className}`
      }
      {...props}
    >
      {selected && <Icon name="check" size={16} className="-ml-1" />}
      {children}
    </button>
  );
}
