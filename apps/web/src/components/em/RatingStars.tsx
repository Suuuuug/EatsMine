"use client";

import { useRef, type KeyboardEvent } from "react";

const FILLED = "/images/rating/star-filled.svg";
const EMPTY = "/images/rating/star-empty.svg";

type RatingStarsProps = {
  /** 1~5 정수 */
  value: number;
  /** 별 한 개의 크기(px) */
  size?: number;
  className?: string;
};

/** 키트 화풍으로 그린 별 5개를 보여 준다(읽기 전용). 점수는 글자로도 읽힌다. */
export function RatingStars({
  value,
  size = 16,
  className = "",
}: RatingStarsProps) {
  const score = Math.min(5, Math.max(0, Math.round(value)));
  return (
    <div
      role="img"
      aria-label={`별점 ${score}점 / 5점`}
      className={`flex gap-0.5 ${className}`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={n}
          src={n <= score ? FILLED : EMPTY}
          alt=""
          width={size}
          height={size}
          draggable={false}
          className={n <= score ? "" : "opacity-50"}
        />
      ))}
    </div>
  );
}

type RatingInputProps = {
  value: number;
  onChange: (value: number) => void;
  label?: string;
};

/** 별점 고르기. 별마다 44px 누르는 영역을 두고, 고른 별까지 채워서 색 말고도 구분된다. 방향키로 바꿀 수 있다. */
export function RatingInput({
  value,
  onChange,
  label = "별점",
}: RatingInputProps) {
  const groupRef = useRef<HTMLDivElement>(null);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const delta =
      event.key === "ArrowRight" || event.key === "ArrowUp"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowDown"
          ? -1
          : 0;
    if (!delta) return;
    event.preventDefault();
    const next = Math.min(5, Math.max(1, value + delta));
    onChange(next);
    groupRef.current
      ?.querySelectorAll<HTMLButtonElement>("button")
      [next - 1]?.focus();
  }

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className="flex items-center"
    >
      {[1, 2, 3, 4, 5].map((score) => (
        <button
          key={score}
          type="button"
          role="radio"
          aria-checked={value === score}
          aria-label={`${score}점`}
          tabIndex={value === score ? 0 : -1}
          onClick={() => onChange(score)}
          className="pressable inline-flex size-11 cursor-pointer items-center justify-center rounded-full focus-ring disabled:cursor-default"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={score <= value ? FILLED : EMPTY}
            alt=""
            width={30}
            height={30}
            draggable={false}
            className={score <= value ? "" : "opacity-50"}
          />
        </button>
      ))}
    </div>
  );
}
