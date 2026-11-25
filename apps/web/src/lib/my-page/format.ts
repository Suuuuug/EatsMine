const monthDay = new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", timeZone: "Asia/Seoul" });
const yearMonth = new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", timeZone: "Asia/Seoul" });

/** "2026-11-21" → "11월 21일" */
export function formatMonthDay(date: string): string {
  return monthDay.format(new Date(date.length === 10 ? `${date}T12:00:00+09:00` : date));
}

/** 가입 시점 → "2026년 11월부터 기록 중" */
export function formatSince(createdAt: string): string {
  return `${yearMonth.format(new Date(createdAt))}부터 기록 중`;
}
