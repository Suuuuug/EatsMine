import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { nearbyMapUrl } from './nearby.ts';
test('위치를 지도 중심과 마커에 전달하고 잘못된 좌표는 거부한다', () => {
  const url = new URL(nearbyMapUrl(37.5665, 126.978));
  assert.equal(url.hostname, 'www.openstreetmap.org');
  assert.equal(url.searchParams.get('marker'), '37.5665,126.978');
  assert.equal(nearbyMapUrl(91, 126), null);
  assert.equal(nearbyMapUrl(NaN, 126), null);
});
