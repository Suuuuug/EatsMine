import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "default" | "muted" | "icon";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /**
   * default: 흰 테두리 + 흰 글자
   * muted:   75% 흐린 테두리/글자 (보조 버튼)
   * icon:    정사각형 아이콘 버튼 — children 으로 아이콘을 넣고 aria-label 필수
   */
  variant?: ButtonVariant;
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-button border-2 font-medium transition-colors " +
  "hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent " +
  "disabled:pointer-events-none disabled:opacity-40";

const variants: Record<ButtonVariant, string> = {
  default: "h-11 min-w-32 px-6 text-base border-foreground text-foreground",
  muted: "h-11 min-w-32 px-6 text-base font-normal border-foreground/75 text-muted",
  icon: "size-11 shrink-0 border-foreground/75 text-muted",
};

export function Button({ variant = "default", className = "", type = "button", ...props }: ButtonProps) {
  return <button type={type} className={`${base} ${variants[variant]} ${className}`} {...props} />;
}
