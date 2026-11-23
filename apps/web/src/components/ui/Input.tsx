import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

/** 흰 테두리 입력창. 라벨이 화면에 없으면 aria-label 을 넣어주세요. */
export function Input({ className = "", ...props }: InputProps) {
  return (
    <input
      className={
        "h-12 w-full rounded-input border-2 border-foreground bg-transparent px-4 text-base text-foreground " +
        "placeholder:text-muted focus-visible:border-accent focus-visible:outline-none " +
        className
      }
      {...props}
    />
  );
}
