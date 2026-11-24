import type { ButtonHTMLAttributes } from "react";

/** 스위치 모양만. 줄 전체가 스위치인 ListSwitchRow와 단독 Switch가 같은 모양을 쓴다. */
export function SwitchTrack({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={
        "flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition-colors duration-150 " +
        (checked ? "justify-end bg-accent" : "justify-start bg-foreground/20")
      }
    >
      <span className="size-6 rounded-full bg-on-accent shadow-sm" />
    </span>
  );
}

type SwitchProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "role"> & {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** 화면에 보이는 라벨이 없을 때 읽어 줄 이름 */
  label: string;
};

/** 단독 스위치. 설정 목록에서는 줄 전체를 누르는 ListSwitchRow를 쓴다. 바뀐 즉시 반영한다. */
export function Switch({ checked, onCheckedChange, label, className = "", ...props }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onCheckedChange(!checked)}
      // 트랙은 28px이지만 버튼은 44×44px(HIG 44pt)
      className={`inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full focus-ring transition-opacity duration-150 active:opacity-70 disabled:pointer-events-none disabled:opacity-40 ${className}`}
      {...props}
    >
      <SwitchTrack checked={checked} />
    </button>
  );
}
