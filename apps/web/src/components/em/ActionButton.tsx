import type { ButtonHTMLAttributes } from "react";

/*
 * 행동 버튼. iOS 버튼 문법(filled · tinted · gray · plain)에 유리(glass)와 위험(danger)을 더했다.
 * 주 행동(fill)은 화면당 하나. 같은 모양을 Link에 쓰려면 actionButtonClass()를 쓴다.
 * 팀 공통 Button(@/components/ui, 흰 테두리)은 팀 마케팅 화면용으로 그대로 둔다.
 */
export type ActionButtonVariant = "fill" | "tinted" | "gray" | "glass" | "plain" | "danger";
export type ActionButtonSize = "sm" | "md" | "lg";

// iOS처럼 눌림은 색을 바꾸지 않고 투명도로 보인다. 채운 면 색을 hover가 덮지 않게 pressable은 쓰지 않는다.
const base =
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap font-semibold " +
  "transition-opacity duration-150 hover:opacity-90 active:opacity-70 focus-ring " +
  "disabled:pointer-events-none disabled:opacity-40 [-webkit-tap-highlight-color:transparent]";

const variants: Record<ActionButtonVariant, string> = {
  fill: "bg-accent text-on-accent",
  tinted: "bg-accent-weak text-accent-dark",
  gray: "bg-fill text-foreground",
  glass: "glass-bar text-foreground shadow-[inset_0_0_0_1px_var(--color-line)]",
  plain: "bg-transparent text-accent-dark",
  danger: "bg-danger-weak text-danger",
};

// sm은 줄 안 보조 동작용. 보이는 높이는 40px, 위아래 2px 투명 영역(::before)으로 누르는 영역 44px(HIG 44pt).
const sizes: Record<ActionButtonSize, string> = {
  sm: "relative h-10 rounded-button px-3.5 text-sm before:absolute before:inset-x-0 before:-inset-y-0.5 before:content-['']",
  md: "h-11 rounded-button px-4 text-base",
  lg: "h-14 rounded-sheet px-5 text-lg",
};

type ClassOptions = { variant?: ActionButtonVariant; size?: ActionButtonSize; block?: boolean; className?: string };

export function actionButtonClass({ variant = "fill", size = "md", block = false, className = "" }: ClassOptions = {}) {
  return `${base} ${variants[variant]} ${sizes[size]} ${block ? "w-full" : ""} ${className}`;
}

type ActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  ClassOptions & {
    /** 처리 중. 버튼은 눌리지 않고 글자는 그대로 둔다(폭이 바뀌지 않게). */
    loading?: boolean;
  };

export function ActionButton({
  variant,
  size,
  block,
  loading = false,
  className,
  type = "button",
  disabled,
  children,
  ...props
}: ActionButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={actionButtonClass({ variant, size, block, className })}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

function Spinner() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 motion-safe:animate-spin">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
