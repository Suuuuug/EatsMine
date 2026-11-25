/** 방향키 이동 대상 인덱스. 처음과 끝에서 멈춘다. 해당 없는 키는 null. */
export function nextRegionIndex(key: string, current: number, count: number): number | null {
  if (count <= 0) return null;
  if (key === "ArrowDown") return Math.min(count - 1, current < 0 ? 0 : current + 1);
  if (key === "ArrowUp") return Math.max(0, current < 0 ? 0 : current - 1);
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  return null;
}
