import type { InputHTMLAttributes, ReactNode } from "react";
import { Icon } from "@/components/icon/Icon";

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  children: ReactNode;
};

/**
 * 원형 체크(iOS 목록 선택). 진짜 checkbox 입력을 그대로 써서 키보드·폼·화면 읽기가 기본 동작을 따른다.
 * 줄 전체가 라벨이라 누르는 영역이 44px 이상이다.
 */
export function Checkbox({ children, className = "", ...props }: CheckboxProps) {
  return (
    <label className={`flex min-h-11 cursor-pointer items-center gap-3 type-body text-foreground has-disabled:cursor-default has-disabled:opacity-40 ${className}`}>
      <input type="checkbox" className="peer sr-only" {...props} />
      <span
        aria-hidden="true"
        className={
          "flex size-6 shrink-0 items-center justify-center rounded-full text-transparent " +
          "shadow-[inset_0_0_0_1.5px_var(--color-muted)] transition-colors duration-150 " +
          "peer-checked:bg-accent peer-checked:text-on-accent peer-checked:shadow-none " +
          "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent"
        }
      >
        <Icon name="check" size={16} />
      </span>
      <span className="min-w-0">{children}</span>
    </label>
  );
}
