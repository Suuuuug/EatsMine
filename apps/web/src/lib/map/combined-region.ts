type Region = { code: string; parentCode: string | null; name: string; fullName: string };
const gwangjuCodes = new Set(['12210', '12240', '12270', '12300', '12330']);
export function isGwangjuDistrict(code: string): boolean { return gwangjuCodes.has(code); }
export function combinedRegions(children: Region[], gwangju: boolean): Region[] {
  const items = children.filter((region) => isGwangjuDistrict(region.code) === gwangju);
  if (!gwangju) items.push({ code: 'gwangju', parentCode: '12', name: '광주', fullName: '전남광주통합특별시 광주' });
  return items;
}
