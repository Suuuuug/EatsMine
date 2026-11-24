import proj4 from 'proj4';
import type { EatplPlace, EatplRawItem } from './eatpl.types.js';

/** 잇플 좌표계 TM128(KATEC) — API 정의서: "좌표는 TM128로 제공" */
const TM128 =
  '+proj=tmerc +lat_0=38 +lon_0=128 +k=0.9999 +x_0=400000 +y_0=600000 +ellps=bessel +units=m +no_defs ' +
  '+towgs84=-115.80,474.99,674.11,1.16,-2.31,-1.63,6.43';
const toWgs84 = proj4(TM128, 'WGS84');

/** 상세 링크로 허용하는 잇플 도메인 (외부 URL allowlist) */
const ALLOWED_MER_URL_HOST = 'web.paybooc.ai';

/** 원본 항목 → 앱 형식. 상세 링크나 이름·주소가 없으면 null (결과에서 제외) */
export function normalizeEatplItem(raw: EatplRawItem): EatplPlace | null {
  const id = merchantIdFromUrl(raw.merUrl);
  const name = raw.merNm?.trim();
  const address = raw.merAddr?.trim();
  if (!id || !raw.merUrl || !name || !address) return null;

  const { lat, lng } = tm128ToLatLng(raw.xaxsVal, raw.yaxsVal);
  const start = formatHhmm(raw.srtTime);
  const end = formatHhmm(raw.endTime);
  const customers = raw.vistCstmrRnkList ?? {};

  return {
    id,
    name,
    address,
    genre: raw.merTpbuzNm?.trim() || null,
    rankNational: finiteOrNull(raw.allSaleRnk),
    rankLocal: finiteOrNull(raw.ccgSaleRnk),
    isLocalFavorite: raw.loclPrsnPpltYn === true,
    estimatedHours: start && end ? { start, end } : null,
    holidays: Array.isArray(raw.hldyDwk)
      ? raw.hldyDwk.filter((d) => typeof d === 'string')
      : [],
    busiest:
      raw.congestionDwk || raw.congestionTizn
        ? { day: raw.congestionDwk || null, time: raw.congestionTizn || null }
        : null,
    topCustomers: [customers.rk01, customers.rk02, customers.rk03].filter(
      (c): c is string => !!c,
    ),
    foreignerVisits: raw.frnrVsitYn === true,
    groupDining: raw.empyVsitYn === true,
    lat,
    lng,
    merUrl: raw.merUrl, // 원본 그대로
  };
}

/**
 * merUrl이 허용된 잇플 도메인(https)일 때만 끝 경로값(매장 고유값)을 돌려준다.
 * 예) https://web.paybooc.ai/mer/web/profile/bQSyX0QU5duyTaDXVqWW5A → bQSyX0QU5duyTaDXVqWW5A
 */
export function merchantIdFromUrl(merUrl: string | undefined): string | null {
  if (!merUrl) return null;
  let url: URL;
  try {
    url = new URL(merUrl);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.hostname !== ALLOWED_MER_URL_HOST)
    return null;
  const last = url.pathname.split('/').filter(Boolean).at(-1);
  return last && /^[A-Za-z0-9_-]+$/.test(last) ? last : null;
}

/** TM128 → WGS84. 값이 없거나 한국 범위를 벗어나면 null */
export function tm128ToLatLng(
  x?: string,
  y?: string,
): { lat: number | null; lng: number | null } {
  const xn = Number(x);
  const yn = Number(y);
  if (!x || !y || !Number.isFinite(xn) || !Number.isFinite(yn))
    return { lat: null, lng: null };
  const [lng, lat] = toWgs84.forward([xn, yn]);
  const inKorea = lat >= 33 && lat <= 39 && lng >= 124 && lng <= 132;
  return inKorea
    ? { lat: round6(lat), lng: round6(lng) }
    : { lat: null, lng: null };
}

function formatHhmm(value?: string): string | null {
  if (!value || !/^\d{4}$/.test(value)) return null;
  const h = Number(value.slice(0, 2));
  const m = Number(value.slice(2));
  return h <= 24 && m < 60 ? `${value.slice(0, 2)}:${value.slice(2)}` : null;
}

function finiteOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function round6(n: number) {
  return Math.round(n * 1e6) / 1e6;
}
