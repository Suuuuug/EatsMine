/**
 * 카카오맵 공식 투영 좌표계 EPSG:5181 (KGD2002 / Korea 2000 Central Belt, GRS80 중부원점 TM)
 * 정변환·역변환 및 카카오맵 레벨(1~14) ↔ 내부 줌(6~19) 1:1 해상도 변환 유틸.
 *
 * - 기준 파라미터: +proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=500000 +ellps=GRS80 +units=m
 * - 카카오맵 타일 해상도: level 1 = 0.25 m/px, level 3 = 1 m/px, ..., level 14 = 2048 m/px (R = 2^(level - 3))
 */

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

// GRS80 타원체 상수
const A = 6378137.0;
const F = 1 / 298.257222101;
const E2 = 2 * F - F * F;
const E4 = E2 * E2;
const E6 = E4 * E2;
const EP2 = E2 / (1 - E2);

// EPSG:5181 중부원점 상수
const LAT0 = 38.0 * DEG_TO_RAD;
const LNG0 = 127.0 * DEG_TO_RAD;
const K0 = 1.0;
const FALSE_EASTING = 200000.0;
const FALSE_NORTHING = 500000.0;

// 자오선 호장 계수
const M_C0 = 1 - E2 / 4 - (3 * E4) / 64 - (5 * E6) / 256;
const M_C2 = (3 * E2) / 8 + (3 * E4) / 32 + (45 * E6) / 1024;
const M_C4 = (15 * E4) / 256 + (45 * E6) / 1024;
const M_C6 = (35 * E6) / 3072;

// 역변환 발점 위도 계수
const E1 = (1 - Math.sqrt(1 - E2)) / (1 + Math.sqrt(1 - E2));
const E1_2 = E1 * E1;
const E1_3 = E1_2 * E1;
const E1_4 = E1_2 * E1_2;

function meridianArc(phi: number): number {
  return (
    A *
    (M_C0 * phi -
      M_C2 * Math.sin(2 * phi) +
      M_C4 * Math.sin(4 * phi) -
      M_C6 * Math.sin(6 * phi))
  );
}

const M0 = meridianArc(LAT0);

export const MIN_KAKAO_ZOOM = 6; // 카카오맵 level 14 (2048 m/px)
export const MAX_KAKAO_ZOOM = 19; // 카카오맵 level 1 (0.25 m/px)

/** 내부 줌(6~19) → 카카오맵 레벨(14~1) */
export function zoomToKakaoLevel(zoom: number): number {
  return Math.max(1, Math.min(14, Math.round(20 - zoom)));
}

/** 카카오맵 레벨(1~14) → 내부 줌(19~6) */
export function kakaoLevelToZoom(level: number): number {
  return Math.max(MIN_KAKAO_ZOOM, Math.min(MAX_KAKAO_ZOOM, Math.round(20 - level)));
}

/** 내부 줌(6~19)에서의 실제 픽셀당 미터 해상도 (카카오맵 R = 2^(level - 3)와 동일) */
export function metersPerPixelForZoom(zoom: number): number {
  return 2 ** (17 - zoom);
}

/** WGS84/GRS80 위도·경도(도) → EPSG:5181 평면 좌표(미터, x: 동쪽+, y: 북쪽+) */
export function latLngToEpsg5181(
  lat: number,
  lng: number,
): { x: number; y: number } {
  const phi = lat * DEG_TO_RAD;
  const lam = lng * DEG_TO_RAD;

  const sinPhi = Math.sin(phi);
  const cosPhi = Math.cos(phi);
  const tanPhi = Math.tan(phi);

  const n = A / Math.sqrt(1 - E2 * sinPhi * sinPhi);
  const t = tanPhi * tanPhi;
  const c = EP2 * cosPhi * cosPhi;
  const aTerm = cosPhi * (lam - LNG0);
  const a2 = aTerm * aTerm;
  const a3 = a2 * aTerm;
  const a4 = a2 * a2;
  const a5 = a4 * aTerm;
  const a6 = a4 * a2;

  const m = meridianArc(phi);

  const x =
    FALSE_EASTING +
    K0 *
      n *
      (aTerm +
        ((1 - t + c) * a3) / 6 +
        ((5 - 18 * t + t * t + 72 * c - 58 * EP2) * a5) / 120);

  const y =
    FALSE_NORTHING +
    K0 *
      (m -
        M0 +
        n *
          tanPhi *
          (a2 / 2 +
            ((5 - t + 9 * c + 4 * c * c) * a4) / 24 +
            ((61 - 58 * t + t * t + 600 * c - 330 * EP2) * a6) / 720));

  return { x, y };
}

/** EPSG:5181 평면 좌표(미터, x: 동쪽+, y: 북쪽+) → WGS84/GRS80 위도·경도(도) */
export function epsg5181ToLatLng(
  x: number,
  y: number,
): { lat: number; lng: number } {
  const m = M0 + (y - FALSE_NORTHING) / K0;
  const mu = m / (A * M_C0);

  const phi1 =
    mu +
    ((3 * E1) / 2 - (27 * E1_3) / 32) * Math.sin(2 * mu) +
    ((21 * E1_2) / 16 - (55 * E1_4) / 32) * Math.sin(4 * mu) +
    ((151 * E1_3) / 96) * Math.sin(6 * mu) +
    ((1097 * E1_4) / 512) * Math.sin(8 * mu);

  const sin1 = Math.sin(phi1);
  const cos1 = Math.cos(phi1);
  const tan1 = Math.tan(phi1);

  const denom = 1 - E2 * sin1 * sin1;
  const n1 = A / Math.sqrt(denom);
  const r1 = (A * (1 - E2)) / (denom * Math.sqrt(denom));
  const c1 = EP2 * cos1 * cos1;
  const t1 = tan1 * tan1;
  const d = (x - FALSE_EASTING) / (n1 * K0);
  const d2 = d * d;
  const d3 = d2 * d;
  const d4 = d2 * d2;
  const d5 = d4 * d;
  const d6 = d4 * d2;

  const phi =
    phi1 -
    ((n1 * tan1) / r1) *
      (d2 / 2 -
        ((5 + 3 * t1 + 10 * c1 - 4 * c1 * c1 - 9 * EP2) * d4) / 24 +
        ((61 +
          90 * t1 +
          298 * c1 +
          45 * t1 * t1 -
          252 * EP2 -
          3 * c1 * c1) *
          d6) /
          720);

  const lam =
    LNG0 +
    (d -
      ((1 + 2 * t1 + c1) * d3) / 6 +
      ((5 - 2 * c1 + 28 * t1 - 3 * c1 * c1 + 8 * EP2 + 24 * t1 * t1) * d5) /
        120) /
      cos1;

  return {
    lat: phi * RAD_TO_DEG,
    lng: lam * RAD_TO_DEG,
  };
}
