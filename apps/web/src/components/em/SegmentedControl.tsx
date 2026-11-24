"use client";

import { useId } from "react";

type Option<T extends string> = { value: T; label: string };

type SegmentedControlProps<T extends string> = {
  /** 묶음 이름(화면 읽기). 화면에 제목이 따로 있으면 그 글자와 같게. */
  label: string;
  options: readonly Option<T>[];
  value: T;
  onValueChange: (value: T) => void;
  className?: string;
};

/**
 * iOS 세그먼트. 2~4개 중 하나를 고르고 즉시 반영한다(보기 전환, 기간, 테마).
 * 같은 화면 안의 조작에만 쓰고 화면 이동(탭)에는 쓰지 않는다. 한 화면에 하나(SEED Segmented Control).
 * 진짜 radio 묶음이라 방향키로 옮겨 가며 고를 수 있다.
 */
export function SegmentedControl<T extends string>({ label, options, value, onValueChange, className = "" }: SegmentedControlProps<T>) {
  const name = useId();

  return (
    <fieldset className={`min-w-0 ${className}`}>
      <legend className="sr-only">{label}</legend>
      <div className="grid auto-cols-fr grid-flow-col gap-0.5 rounded-[11px] bg-fill p-0.5">
        {options.map((option) => (
          <label key={option.value} className="relative min-w-0 before:absolute before:inset-x-0 before:-inset-y-0.5 before:content-['']">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onValueChange(option.value)}
              className="peer sr-only"
            />
            <span
              className={
                // 칸 40px + 라벨의 ::before가 트랙 위아래 2px까지 덮어 누르는 영역 44px. 안쪽 모서리 = 바깥 11px - 여백 2px(동심원 모서리)
                "flex h-10 cursor-pointer items-center justify-center truncate rounded-[9px] px-3 text-sm font-medium text-muted " +
                "transition-[background-color,color,box-shadow] duration-150 " +
                "peer-checked:bg-surface peer-checked:font-semibold peer-checked:text-foreground " +
                "peer-checked:shadow-[0_1px_3px_oklch(0_0_0/0.12),0_0_0_0.5px_var(--color-line)] " +
                "peer-focus-visible:outline-2 peer-focus-visible:outline-accent"
              }
            >
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
