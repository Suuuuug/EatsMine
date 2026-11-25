// tokens.css 의 --color-owner-1..8 (light-dark(oklch, oklch))을 읽어 대비와 색 구분도를 검증한다.
// 사용: node apps/web/scripts/check-owner-colors.mjs  (실패하면 종료 코드 1)
// 근거:
//  - 비텍스트 대비 3:1 (WCAG 2.2 1.4.11): https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast
//  - Okabe-Ito 색각 이상 친화 팔레트: https://jfly.uni-koeln.de/color/
//  - 색각 이상 시뮬레이션: Machado et al. 2009 (severity 1.0), 선형 sRGB에 적용
//  - oklch/oklab 변환: https://bottosson.github.io/posts/oklab/
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');
const MIN_CONTRAST = 3;
const MIN_DE = 8; // OKLab 거리 x100, 정상 색각
const MIN_DE_CVD = 3; // 색각 이상 시뮬레이션 후. 라이트에서 주황·노랑은 배경 3:1 때문에 명도를 더 못 벌려 3.5 안팎이 한계다(색만으로 구분이 어려우면 UI가 패턴·라벨을 병행한다)

const parseOklch = (t) => {
  const m = t.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)/);
  if (!m) throw new Error(`oklch 파싱 실패: ${t}`);
  return { L: +m[1], C: +m[2], h: +m[3] };
};
const slots = [];
for (let i = 1; i <= 8; i++) {
  const m = css.match(new RegExp(`--color-owner-${i}:\\s*light-dark\\((oklch\\([^)]*\\)),\\s*(oklch\\([^)]*\\))\\)`));
  if (!m) throw new Error(`--color-owner-${i} 를 찾지 못했다`);
  slots.push({ light: parseOklch(m[1]), dark: parseOklch(m[2]) });
}
const bg = css.match(/--color-background:\s*light-dark\((oklch\([^)]*\)),\s*(oklch\([^)]*\))\)/);
const bgs = { light: parseOklch(bg[1]), dark: parseOklch(bg[2]) };

const toLinear = ({ L, C, h }) => {
  const a = C * Math.cos((h * Math.PI) / 180), b = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
};
const inGamut = (rgb) => rgb.every((v) => v >= -0.0005 && v <= 1.0005);
const clip = (rgb) => rgb.map((v) => Math.min(1, Math.max(0, v)));
const lum = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const contrast = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const toOklab = ([r, g, b]) => {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
};
const dE = (a, b) => 100 * Math.hypot(...toOklab(a).map((v, i) => v - toOklab(b)[i]));
const CVD = {
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
  tritan: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.3039]],
};
const sim = (rgb, mat) => clip(mat.map((row) => row[0] * rgb[0] + row[1] * rgb[1] + row[2] * rgb[2]));

let failed = false;
const fail = (msg) => { failed = true; console.log(`FAIL ${msg}`); };

for (const mode of ['light', 'dark']) {
  const bgRgb = clip(toLinear(bgs[mode]));
  const cols = slots.map((s) => s[mode]);
  const rgbs = cols.map(toLinear);
  console.log(`\n[${mode}] 배경 L=${bgs[mode].L}`);
  console.log('슬롯  oklch                대비   gamut');
  cols.forEach((c, i) => {
    const cr = contrast(clip(rgbs[i]), bgRgb);
    const ok = inGamut(rgbs[i]);
    console.log(`  ${i + 1}   ${c.L} ${c.C} ${c.h}`.padEnd(30) + `${cr.toFixed(2)}   ${ok ? 'ok' : 'clip'}`);
    if (cr < MIN_CONTRAST) fail(`${mode} 슬롯 ${i + 1} 대비 ${cr.toFixed(2)} < ${MIN_CONTRAST}`);
    if (!ok) fail(`${mode} 슬롯 ${i + 1} 이 sRGB 범위를 벗어난다`);
  });
  const clipped = rgbs.map(clip);
  for (const [name, f] of [['정상', (x) => x], ...Object.entries(CVD).map(([n, mat]) => [n, (x) => sim(x, mat)])]) {
    let min = Infinity, pair = '';
    for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) {
      const d = dE(f(clipped[i]), f(clipped[j]));
      if (d < min) { min = d; pair = `${i + 1}-${j + 1}`; }
    }
    const need = name === '정상' ? MIN_DE : MIN_DE_CVD;
    console.log(`  최소 ΔE(${name}) = ${min.toFixed(1)} (슬롯 ${pair}, 기준 ${need})`);
    if (min < need) fail(`${mode} ${name} 최소 ΔE ${min.toFixed(1)} < ${need}`);
  }
}
console.log(failed ? '\n결과: 실패' : '\n결과: 모두 통과');
process.exit(failed ? 1 : 0);
