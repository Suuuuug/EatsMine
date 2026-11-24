"use client";

import { useRef, type InputHTMLAttributes } from "react";
import { Icon } from "@/components/icon/Icon";

// onSubmit은 폼 이벤트가 아니라 검색어 문자열을 받는다(네이티브 핸들러 타입과 겹치지 않게 뺀다)
type SearchFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange" | "onSubmit"> & {
  /** 화면에 라벨이 없으므로 읽어 줄 이름. 예: "지역이나 음식 검색" */
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  onSubmit?: (value: string) => void;
};

/** iOS 검색칸. 글자가 있으면 지우기 버튼이 나오고, 지우면 입력칸으로 포커스가 돌아간다. */
export function SearchField({ label, value, onValueChange, onSubmit, placeholder, className = "", ...props }: SearchFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <form
      role="search"
      className={`field flex items-center gap-2 pl-3 pr-1 ${className}`}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.(value);
      }}
    >
      <Icon name="search" size={20} className="shrink-0 text-muted" />
      <input
        ref={inputRef}
        type="search"
        aria-label={label}
        placeholder={placeholder ?? label}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        enterKeyHint="search"
        className="min-w-0 flex-1 bg-transparent py-2.5 text-base text-foreground outline-none placeholder:text-muted [&::-webkit-search-cancel-button]:hidden"
        {...props}
      />
      {value && (
        <button
          type="button"
          aria-label="검색어 지우기"
          onClick={() => {
            onValueChange("");
            inputRef.current?.focus();
          }}
          className="-my-1 inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted hover:text-foreground focus-ring"
        >
          <Icon name="close" size={18} />
        </button>
      )}
    </form>
  );
}
