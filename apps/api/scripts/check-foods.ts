/**
 * foods.json을 고친 뒤, 음식 × 추천 지역마다 실제 매장이 나오는지 우리 API로 확인한다.
 * 실행: (api 서버 실행 + db:seed:foods 후) npm run foods:check -w api
 *   API_URL 기본값 http://localhost:4000
 *
 * - matchedBy keyword: 가맹점명에 검색어가 있는 매장으로 찾음
 * - matchedBy genre:   검색어로 못 찾아 업종 매출 상위로 대체
 * - GET /restaurants rate limit(1분 30회)에 걸리지 않게 2.1초 간격으로 호출한다.
 */
type Food = { id: number; name: string };
type Detail = { regions: { code: string; fullName: string }[] };
type Result = {
  items: unknown[];
  matchedBy?: string;
  region: { fullName: string };
};

const API_URL = (process.env.API_URL ?? 'http://localhost:4000').replace(
  /\/+$/,
  '',
);
/** 추천 지역이 없는 음식은 이 지역으로 확인 (서울 중구) */
const FALLBACK_REGION = '11140';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function get<T>(path: string): Promise<T> {
  const res = await fetch(API_URL + path);
  if (!res.ok)
    throw new Error(`${path} → HTTP ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

const { items: foods } = await get<{ items: Food[] }>('/foods');
if (foods.length === 0)
  throw new Error(
    '음식이 없습니다. npm run db:seed:foods -w api 먼저 실행하세요.',
  );

let weak = 0;
for (const food of foods) {
  const detail = await get<Detail>(`/foods/${food.id}`);
  const targets = detail.regions.length
    ? detail.regions.map((r) => r.code)
    : [FALLBACK_REGION];
  for (const code of targets) {
    const r = await get<Result>(
      `/restaurants?foodId=${food.id}&regionCode=${code}`,
    );
    const flag =
      r.items.length === 0 ? '❌' : r.matchedBy === 'genre' ? '△' : '✅';
    if (flag !== '✅') weak++;
    console.log(
      `${flag} ${food.name} · ${r.region.fullName}${detail.regions.length ? '' : ' (지역 없음 → 예시)'}: ${r.items.length}건 (${r.matchedBy})`,
    );
    await sleep(2100);
  }
}
console.log(
  `\n완료: ✅ 검색어로 찾음 / △ 업종으로 대체 / ❌ 0건 — 확인 필요 ${weak}개`,
);
