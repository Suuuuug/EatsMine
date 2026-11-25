export type RestaurantRowData = {
  rankNational: number | null;
  estimatedHours: { start: string; end: string } | null;
};

/** 값이 있는 보조 정보만 문구로 만든다. 없는 값은 줄 자체를 만들지 않는다. */
export function restaurantRowFacts(d: RestaurantRowData): string[] {
  const facts: string[] = [];
  if (typeof d.rankNational === "number" && Number.isFinite(d.rankNational)) facts.push(`전국 매출 상위 ${d.rankNational}%`);
  if (d.estimatedHours?.start && d.estimatedHours?.end) facts.push(`영업 예상 시간 ${d.estimatedHours.start}–${d.estimatedHours.end}`);
  return facts;
}
