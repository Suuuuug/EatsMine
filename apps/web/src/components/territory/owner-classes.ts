import type { OwnerSlot } from "@/lib/territory/owner-colors";

// Tailwind가 클래스를 찾을 수 있게 문자열을 그대로 적는다. 색 값은 tokens.css의 --color-owner-N.
export const OWNER_FILL: Record<OwnerSlot, string> = {
  1: "fill-owner-1", 2: "fill-owner-2", 3: "fill-owner-3", 4: "fill-owner-4",
  5: "fill-owner-5", 6: "fill-owner-6", 7: "fill-owner-7", 8: "fill-owner-8",
};
export const OWNER_BG: Record<OwnerSlot, string> = {
  1: "bg-owner-1", 2: "bg-owner-2", 3: "bg-owner-3", 4: "bg-owner-4",
  5: "bg-owner-5", 6: "bg-owner-6", 7: "bg-owner-7", 8: "bg-owner-8",
};

/** 같은 색을 나눠 쓰는 사용자 칩에 덧입히는 빗금 */
export const HATCH_STYLE = {
  backgroundImage: "repeating-linear-gradient(45deg, var(--color-foreground) 0 1.5px, transparent 1.5px 5px)",
} as const;
