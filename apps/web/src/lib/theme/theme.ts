export type Theme = 'system' | 'light' | 'dark';
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export function parseTheme(value: string | null): Theme {
  return value === 'light' || value === 'dark' ? value : 'system';
}
/*
 * 계절은 달이 아니라 절기로 나눈다: 입춘 2/4, 입하 5/5, 입추 8/7, 입동 11/7.
 * 절기 날짜는 해마다 하루쯤 달라지므로 가까운 고정일로 근사한다.
 * 그래서 11월 중순은 가을이 아니라 겨울이다.
 */
export function seasonForDate(month: number, day: number): Season {
  const md = month * 100 + day;
  if (md >= 1107 || md < 204) return 'winter';
  if (md < 505) return 'spring';
  if (md < 807) return 'summer';
  return 'autumn';
}
/** 지금 한국 날짜(Asia/Seoul) 기준 계절. 도감 기본 탭과 배경 계절이 같은 값을 쓰도록 한 곳에서 계산한다. */
export function currentSeason(now: Date = new Date()): Season {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric' }).formatToParts(now);
  const part = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return seasonForDate(part('month'), part('day'));
}
