/**
 * 법정동 CSV → data/regions.json 변환 (D5)
 *
 * 원본: 공공데이터포털 "국토교통부_전국 법정동" CSV (이용허락 제한 없음)
 *   → apps/api/data/raw/legal-dong.csv 에 두고 `npm run regions:build -w api`
 *
 * 규칙
 * - 영토 단위: 시·군 + 광역·특별시의 자치구. 일반구(예: 수원시장안구)는 상위 시로 합친다.
 * - eatpl_query: 잇플 주소는 대부분 예전 짧은 시·도명("경기 수원시", "광주 서구")이라 그 형식으로 조회한다.
 *   세종은 "세종특별자치시" (짧은 "세종"은 세종대로 등 다른 지역 주소와 섞임).
 * - address_aliases: 잇플 결과 주소의 첫 단어(시·도)를 우리 시·도 코드로 바꿀 때 쓰는 이름 목록.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dataDir = join(import.meta.dirname, '..', 'data');
const csvPath = join(dataDir, 'raw', 'legal-dong.csv');
const outPath = join(dataDir, 'regions.json');

type Region = {
  code: string;
  parentCode: string | null;
  level: 'sido' | 'sigungu';
  name: string;
  fullName: string;
  eatplQuery: string | null;
  addressAliases: string[] | null;
};

/** 시·도 코드 → 잇플 조회용 짧은 이름, 주소 별칭 */
const SIDO: Record<string, { short: string; aliases: string[] }> = {
  '11': { short: '서울', aliases: ['서울', '서울시', '서울특별시'] },
  '26': { short: '부산', aliases: ['부산', '부산시', '부산광역시'] },
  '27': { short: '대구', aliases: ['대구', '대구시', '대구광역시'] },
  '28': { short: '인천', aliases: ['인천', '인천시', '인천광역시'] },
  '30': { short: '대전', aliases: ['대전', '대전시', '대전광역시'] },
  '31': { short: '울산', aliases: ['울산', '울산시', '울산광역시'] },
  '36': { short: '세종특별자치시', aliases: ['세종', '세종시', '세종특별자치시'] },
  '41': { short: '경기', aliases: ['경기', '경기도'] },
  '43': { short: '충북', aliases: ['충북', '충청북도'] },
  '44': { short: '충남', aliases: ['충남', '충청남도'] },
  '47': { short: '경북', aliases: ['경북', '경상북도'] },
  '48': { short: '경남', aliases: ['경남', '경상남도'] },
  '50': { short: '제주', aliases: ['제주', '제주도', '제주특별자치도'] },
  '51': { short: '강원', aliases: ['강원', '강원도', '강원특별자치도'] },
  '52': { short: '전북', aliases: ['전북', '전라북도', '전북특별자치도'] },
  // 2026-07 출범. 잇플 주소는 대부분 예전 이름("전남 여수시", "광주 서구")
  '12': {
    short: '전남',
    aliases: ['전남', '전라남도', '광주', '광주시', '광주광역시', '전남광주', '전남광주통합특별시'],
  },
};

/** 전남광주통합특별시 중 옛 광주광역시 자치구 → 잇플 조회 시 "광주 ○구" */
const FORMER_GWANGJU_GU = new Set(['동구', '서구', '남구', '북구', '광산구']);

const lines = readFileSync(csvPath, 'utf-8').replace(/^﻿/, '').trim().split(/\r?\n/);
const header = lines[0].split(',');
const col = (name: string) => {
  const i = header.indexOf(name);
  if (i < 0) throw new Error(`CSV에 '${name}' 컬럼이 없습니다: ${header.join(',')}`);
  return i;
};
const [C_CODE, C_SIDO, C_SGG, C_EMD, C_RI] = ['법정동코드', '시도명', '시군구명', '읍면동명', '리명'].map(col);
const rows = lines.slice(1).map((l) => l.split(','));

const sidoRows = rows.filter((r) => r[C_SGG] === '' && r[C_EMD] === '' && r[C_CODE].endsWith('00000000'));
const sggRows = rows.filter((r) => r[C_SGG] !== '' && r[C_EMD] === '' && r[C_RI] === '');

const regions: Region[] = [];

for (const r of sidoRows) {
  const code = r[C_CODE].slice(0, 2);
  const meta = SIDO[code];
  if (!meta) throw new Error(`보정 규칙에 없는 시·도: ${code} ${r[C_SIDO]} — SIDO 표에 추가하세요`);
  regions.push({
    code,
    parentCode: null,
    level: 'sido',
    name: r[C_SIDO],
    fullName: r[C_SIDO],
    eatplQuery: null,
    addressAliases: meta.aliases,
  });
}

// 일반구 판별: 같은 시·도에 "앞 4자리 + 0" 코드의 시가 있고, 이름이 그 시 이름으로 시작하는 구
const sggByCode = new Map(sggRows.map((r) => [r[C_CODE].slice(0, 5), r]));
const isGeneralGu = (r: string[]) => {
  const code = r[C_CODE].slice(0, 5);
  if (code.endsWith('0') || !r[C_SGG].endsWith('구')) return false;
  const parent = sggByCode.get(code.slice(0, 4) + '0');
  return !!parent && parent[C_SGG].endsWith('시') && r[C_SGG].startsWith(parent[C_SGG]);
};

let skippedGeneralGu = 0;
for (const r of sggRows) {
  if (isGeneralGu(r)) {
    skippedGeneralGu++;
    continue;
  }
  const code = r[C_CODE].slice(0, 5);
  const sidoCode = code.slice(0, 2);
  const meta = SIDO[sidoCode];
  if (!meta) throw new Error(`보정 규칙에 없는 시·도: ${sidoCode}`);
  const name = r[C_SGG];

  let eatplQuery: string;
  let fullName = `${r[C_SIDO]} ${name}`;
  if (sidoCode === '36') {
    eatplQuery = meta.short; // 세종특별자치시 (하위 시·군·구 없음)
    fullName = r[C_SIDO];
  } else if (sidoCode === '12' && FORMER_GWANGJU_GU.has(name)) {
    eatplQuery = `광주 ${name}`;
  } else {
    eatplQuery = `${meta.short} ${name}`;
  }

  regions.push({ code, parentCode: sidoCode, level: 'sigungu', name, fullName, eatplQuery, addressAliases: null });
}

regions.sort((a, b) => a.code.localeCompare(b.code));
writeFileSync(outPath, JSON.stringify(regions, null, 2) + '\n');

const sigungu = regions.filter((r) => r.level === 'sigungu').length;
console.log(`시·도 ${regions.length - sigungu}개, 시·군·구 ${sigungu}개 (일반구 ${skippedGeneralGu}개 합침) → ${outPath}`);
