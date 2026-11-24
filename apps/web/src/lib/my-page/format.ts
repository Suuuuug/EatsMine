import type { MyPageData } from "@/types/my-page";

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

/** 공유할 문장. 예시 데이터면 남의 기록처럼 보이지 않게 서비스 초대 문구만 쓴다. */
export function shareText(data: MyPageData): string {
  if (data.isSample) return "EatsMine에서 지역과 제철음식을 골라 맛집을 찾아봐요";
  return `EatsMine에서 지역 ${data.regionVisits.length}곳을 칠하고 음식 ${data.foodCollection.length}개를 모았어요`;
}
