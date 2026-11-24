import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildAddressMatcher } from './address-matcher.js';

// 실제 seed 데이터로 검증
const rows = JSON.parse(
  readFileSync(
    join(import.meta.dirname, '..', '..', 'data', 'regions.json'),
    'utf-8',
  ),
);
const match = buildAddressMatcher(rows);

describe('buildAddressMatcher', () => {
  it.each([
    ['경기 수원시 영통구 매영로 150', '41110'], // 일반구 → 시
    ['경기도 수원시 팔달구 덕영대로 923-1', '41110'],
    ['서울 중구 을지로30길 20', '11140'],
    ['서울특별시 중구 세종대로 110', '11140'],
    ['대전 중구 대종로 480', '30140'], // "서울 중구" 검색에 섞여 오는 경우
    ['광주 서구 상무대로 1', '12240'], // 옛 광주광역시 → 전남광주통합특별시
    ['광주광역시 광산구 1', '12330'],
    ['전남 여수시 1', '12130'],
    ['전남광주통합특별시 여수시 1', '12130'],
    ['경기 광주시 1', '41610'], // 시·도 "광주"와 헷갈리지 않음
    ['세종특별자치시 한누리대로 1', '36110'],
    ['강원도 속초시 1', '51210'],
    ['대구 군위군 1', '27720'],
  ])('%s → %s', (address, code) => {
    expect(match(address)).toBe(code);
  });

  it.each(['', '부산', '없는도 어딘가', '경기 없는시 1'])(
    '매칭 실패는 null: "%s"',
    (address) => {
      expect(match(address)).toBeNull();
    },
  );
});
