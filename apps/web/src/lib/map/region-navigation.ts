type Region = { code: string; parentCode: string | null; name: string; fullName: string };

/** 같은 이름의 시군구도 전체 지역명으로 구별해 보여준다. */
export function searchRegions<T extends Region>(regions: readonly T[], query: string): T[] {
  const words = query.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return regions.filter(region => words.every(word => region.fullName.includes(word)))
    .sort((a, b) => a.fullName.localeCompare(b.fullName, 'ko'));
}

export function resolveRegionSelection<T extends Region>(regions: readonly T[], params: URLSearchParams): { province: T | null; region: T | null } {
  const region = regions.find(item => item.parentCode !== null && item.code === params.get('regionCode')) ?? null;
  const provinceCode = region?.parentCode ?? params.get('provinceCode');
  const province = regions.find(item => item.parentCode === null && item.code === provinceCode) ?? null;
  return { province, region: province ? region : null };
}

export function regionSearchParams(current: URLSearchParams, provinceCode: string | null, regionCode: string | null): URLSearchParams {
  const params = new URLSearchParams(current);
  for (const key of ['provinceCode', 'regionCode', 'preview', 'view']) params.delete(key);
  if (provinceCode) params.set('provinceCode', provinceCode);
  if (regionCode) params.set('regionCode', regionCode);
  return params;
}
