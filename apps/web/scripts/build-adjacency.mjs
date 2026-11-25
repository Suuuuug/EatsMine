// 시도(2자리)·시군구(5자리) 경계 인접 쌍을 계산해 src/data/region-adjacency.json 으로 쓴다.
// 사용: node apps/web/scripts/build-adjacency.mjs
// GeoJSON 은 단순화된 preview 라 경계가 정확히 겹치지 않는다. 그래서 한 지역의 꼭짓점이 다른 지역의
// 경계선(선분)에서 THRESHOLD 도(약 0.9km) 안에 있으면 인접으로 본다. 섬(제주·울릉 등)은 이웃이 없을 수 있다.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const GEO = new URL('../public/images/maps/geojson/', import.meta.url);
const OUT = new URL('../src/data/region-adjacency.json', import.meta.url);
const THRESHOLD = 0.008;

function rings(geometry) {
  const polys = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  return polys.flatMap((p) => p);
}

function prepare(features) {
  return features.map((f) => {
    const rs = rings(f.geometry);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const r of rs) for (const [x, y] of r) {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    return { code: String(f.properties.code), rings: rs, bbox: [minX, minY, maxX, maxY] };
  });
}

function segDist2(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx - px, cy = ay + t * dy - py;
  return cx * cx + cy * cy;
}

function touches(a, b, thr) {
  const t2 = thr * thr;
  const pass = (from, to) => {
    for (const r of from.rings) for (const [px, py] of r) {
      for (const s of to.rings) for (let i = 0; i < s.length - 1; i++) {
        if (segDist2(px, py, s[i][0], s[i][1], s[i + 1][0], s[i + 1][1]) <= t2) return true;
      }
    }
    return false;
  };
  return pass(a, b) || pass(b, a);
}

function adjacency(features, thr) {
  const items = prepare(features);
  const out = {};
  for (const it of items) out[it.code] = [];
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
    const a = items[i], b = items[j];
    if (a.bbox[0] > b.bbox[2] + thr || b.bbox[0] > a.bbox[2] + thr || a.bbox[1] > b.bbox[3] + thr || b.bbox[1] > a.bbox[3] + thr) continue;
    if (touches(a, b, thr)) { out[a.code].push(b.code); out[b.code].push(a.code); }
  }
  for (const k of Object.keys(out)) out[k].sort();
  return out;
}

const read = (name) => JSON.parse(readFileSync(new URL(name, GEO), 'utf8')).features;
const result = { ...adjacency(read('sido.preview.geojson'), THRESHOLD), ...adjacency(read('territories.preview.geojson'), THRESHOLD) };
const sorted = Object.fromEntries(Object.keys(result).sort().map((k) => [k, result[k]]));
writeFileSync(OUT, JSON.stringify(sorted) + '\n');
const isolated = Object.keys(sorted).filter((k) => sorted[k].length === 0);
console.log(`${fileURLToPath(OUT)}: ${Object.keys(sorted).length}개 지역, 이웃 없는 지역 ${isolated.length}개 (${isolated.join(', ')})`);
