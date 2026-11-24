import type { ButtonHTMLAttributes } from "react";
import { Icon, type IconName } from "@/components/icon/Icon";

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  icon: IconName;
  /** 화면 읽기 프로그램이 읽는 동작 이름. 아이콘만 있으므로 필수. */
  label: string;
  variant?: "gray" | "glass" | "plain";
};

const variants = {
  gray: "bg-fill text-foreground",
  // 지도·사진 위에 떠 있을 때
  glass: "glass-bar text-foreground shadow-[inset_0_0_0_1px_var(--color-line)]",
  plain: "bg-transparent text-foreground",
};

/** 원형 44px 아이콘 버튼. 닫기, 뒤로, 공유처럼 뜻이 널리 알려진 아이콘에만 쓴다. */
export function IconButton({ icon, label, variant = "gray", className = "", type = "button", ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={
        `inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition-opacity duration-150 ` +
        `hover:opacity-80 active:opacity-60 focus-ring disabled:pointer-events-none disabled:opacity-40 ${variants[variant]} ${className}`
      }
      {...props}
    >
      <Icon name={icon} size={22} />
    </button>
  );
}
