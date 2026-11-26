"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "@/components/icon/Icon";
import type { IconName } from "@/components/icon/names";

export type GlassSelectOption<T extends string> = { value: T; label: string };

type GlassSelectProps<T extends string> = {
  options: readonly GlassSelectOption<T>[];
  value: T;
  onChange: (next: T) => void;
  /** 버튼을 읽어 줄 이름(스크린리더) */
  label: string;
  /** 펼친 목록의 이름(스크린리더) */
  listLabel: string;
  /**
   * text: 글자만 있는 작은 버튼(도감 필터처럼 목록 위 도구 줄)
   * field: 입력칸 모양(폼 안에서 값을 고를 때)
   */
  trigger?: "text" | "field";
  /** text 버튼 앞 아이콘 */
  icon?: IconName;
  /** 목록을 버튼 오른쪽(기본) 또는 왼쪽 끝에 맞춘다. field는 버튼 폭과 같다 */
  align?: "left" | "right";
  /** 이 값이 골라져 있으면 field 버튼 글자를 흐리게(“고르지 않기” 같은 빈 선택) */
  placeholderValue?: T;
};

function ChevronDownIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 text-muted transition-transform duration-150 ${open ? "rotate-180" : ""}`}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/**
 * 유리 패널(material-thick) 드롭다운. 도감 수집 필터와 리뷰 음식 선택이 같이 쓴다.
 * 키보드: 버튼에서 ↑↓/Home/End로 열고, 목록에서 ↑↓/Home/End로 이동, Enter·Space로 고르고 Esc로 닫는다.
 */
export function GlassSelect<T extends string>({
  options,
  value,
  onChange,
  label,
  listLabel,
  trigger = "text",
  icon,
  align = "right",
  placeholderValue,
}: GlassSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const optionIdPrefix = useId();

  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  const openMenu = (initialIndex = selectedIndex) => {
    setActiveIndex(initialIndex);
    setOpen(true);
  };

  const closeMenu = (restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) {
      requestAnimationFrame(() => triggerRef.current?.focus());
    }
  };

  const commitSelection = (index: number) => {
    const target = options[index];
    if (target) onChange(target.value);
    closeMenu(true);
  };

  useEffect(() => {
    if (!open) return;
    listboxRef.current?.focus();
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [open]);

  const currentLabel = options[selectedIndex]?.label ?? "";
  const activeOption = options[activeIndex] ?? options[0];

  const handleTriggerKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
  ) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      openMenu(selectedIndex);
    } else if (event.key === "Home") {
      event.preventDefault();
      openMenu(0);
    } else if (event.key === "End") {
      event.preventDefault();
      openMenu(options.length - 1);
    }
  };

  const handleListboxKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const count = options.length;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((prev) => (prev + 1) % count);
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((prev) => (prev - 1 + count) % count);
        break;
      case "Home":
        event.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        event.preventDefault();
        setActiveIndex(count - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        commitSelection(activeIndex);
        break;
      case "Escape":
        event.preventDefault();
        // 시트(dialog) 안에서는 Esc가 시트까지 닫지 않게 여기서 멈춘다.
        event.stopPropagation();
        closeMenu(true);
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  };

  const isField = trigger === "field";
  const isPlaceholder = placeholderValue !== undefined && value === placeholderValue;

  const triggerClass = isField
    ? "field pressable flex cursor-pointer items-center justify-between gap-2 py-2.5 pr-3 pl-3.5 text-left type-body transition-colors disabled:cursor-not-allowed disabled:opacity-60 " +
      (isPlaceholder ? "text-muted" : "font-medium text-foreground")
    : "pressable inline-flex h-11 items-center gap-1.5 rounded-input px-2.5 text-xs font-medium transition-colors " +
      (open ? "bg-fill text-foreground" : "text-muted hover:text-foreground");

  const panelPosition = isField
    ? "inset-x-0"
    : align === "left"
      ? "left-0 min-w-32"
      : "right-0 min-w-32";

  return (
    <div ref={containerRef} className={isField ? "relative w-full" : "relative"}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-label={`${label}: ${currentLabel}`}
        onClick={() => (open ? closeMenu(false) : openMenu(selectedIndex))}
        onKeyDown={handleTriggerKeyDown}
        className={triggerClass}
      >
        {!isField && icon && (
          <Icon name={icon} size={13} className="shrink-0 opacity-75" />
        )}
        <span className={isField ? "min-w-0 truncate" : undefined}>
          {currentLabel}
        </span>
        <ChevronDownIcon open={open} />
      </button>

      {open && (
        <div
          ref={listboxRef}
          id={listboxId}
          role="listbox"
          tabIndex={-1}
          aria-label={listLabel}
          aria-activedescendant={
            activeOption ? `${optionIdPrefix}-${activeIndex}` : undefined
          }
          onKeyDown={handleListboxKeyDown}
          className={`material-thick absolute ${panelPosition} z-30 mt-1.5 max-h-64 overflow-y-auto rounded-input p-1 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`}
        >
          {options.map((option, index) => {
            const selected = option.value === value;
            const highlighted = index === activeIndex;
            return (
              <div
                key={option.value}
                id={`${optionIdPrefix}-${index}`}
                role="option"
                aria-selected={selected}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => commitSelection(index)}
                className={
                  "flex min-h-11 w-full cursor-pointer items-center justify-between rounded-[7px] px-2.5 py-1 text-left transition-colors " +
                  (isField ? "type-body " : "text-xs ") +
                  (selected
                    ? "bg-accent-weak font-semibold text-accent-dark"
                    : highlighted
                      ? "bg-fill text-foreground"
                      : "text-muted hover:text-foreground")
                }
              >
                <span>{option.label}</span>
                {selected && <Icon name="check" size={13} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
