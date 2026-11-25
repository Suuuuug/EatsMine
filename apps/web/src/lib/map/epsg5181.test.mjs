import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  epsg5181ToLatLng,
  kakaoLevelToZoom,
  latLngToEpsg5181,
  metersPerPixelForZoom,
  zoomToKakaoLevel,
} from "./epsg5181.ts";

test("EPSG:5181 정변환과 역변환이 대한민국 주요 지점에서 1cm 이내로 왕복 일치한다", () => {
  const points = [
    { name: "서울 시청", lat: 37.5662952, lng: 126.9779451 },
    { name: "강릉", lat: 37.751853, lng: 128.876057 },
    { name: "부산 해운대", lat: 35.158698, lng: 129.160384 },
    { name: "제주 서귀포", lat: 33.25412, lng: 126.560076 },
    { name: "독도", lat: 37.242936, lng: 131.86701 },
  ];

  for (const pt of points) {
    const tm = latLngToEpsg5181(pt.lat, pt.lng);
    const back = epsg5181ToLatLng(tm.x, tm.y);
    assert.ok(
      Math.abs(back.lat - pt.lat) < 1e-6,
      `${pt.name} 위도 오차 초과: ${back.lat} vs ${pt.lat}`,
    );
    assert.ok(
      Math.abs(back.lng - pt.lng) < 1e-6,
      `${pt.name} 경도 오차 초과: ${back.lng} vs ${pt.lng}`,
    );
  }

  // 원점(38°N, 127°E)은 정확히 (200000m, 500000m)
  const origin = latLngToEpsg5181(38.0, 127.0);
  assert.ok(Math.abs(origin.x - 200000) < 1e-6);
  assert.ok(Math.abs(origin.y - 500000) < 1e-6);
});

test("카카오맵 14개 전체 레벨(1~14)과 내부 줌(6~19)이 1:1 대응하고 공식 해상도와 일치한다", () => {
  for (let level = 1; level <= 14; level += 1) {
    const zoom = kakaoLevelToZoom(level);
    assert.equal(zoomToKakaoLevel(zoom), level);
    assert.equal(metersPerPixelForZoom(zoom), 2 ** (level - 3));
  }
});
