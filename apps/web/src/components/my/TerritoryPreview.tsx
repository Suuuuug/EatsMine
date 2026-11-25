import { TerritoryMap } from "@/components/em/TerritoryMap";
import regionCodes from "../../../public/images/maps/region-codes.json";
import { getTravelProvinceName } from "@/lib/seo/site";

const SHOWN = 6;

/*
 * 마이페이지용 영토 미리보기(읽기 전용). 지도는 크게 두고, 칠한 곳의 이름을 옆에 적는다.
 * 지도만으로는 작은 시·군·구를 알아보기 어렵기 때문이다.
 */
export function TerritoryPreview({ visited }: { visited: readonly string[] }) {
  const owned = new Set(visited);
  const provinces = new Map(regionCodes.provinces.map((p) => [p.code, getTravelProvinceName(p.code, p.name)]));
  // 같은 이름의 구(중구 등)를 구분하려고 시·도 이름을 앞에 붙인다.
  const names = regionCodes.territories
    .filter((t) => owned.has(t.code))
    .map((t) => `${provinces.get(t.code.slice(0, 2)) ?? ""} ${t.name}`.trim());

  return (
    <div className="@container flex flex-col gap-3"><div className="flex flex-col gap-3 @lg:flex-row @lg:items-center @lg:gap-6">
      <div className="min-w-0 @lg:flex-1">
        <TerritoryMap visited={visited} territoryView compact />
      </div>
      {names.length > 0 && (
        <ul aria-label="칠한 지역" className="flex flex-wrap gap-2 @lg:w-2/5 @lg:flex-none">
          {names.slice(0, SHOWN).map((name) => (
            <li key={name} className="inline-flex h-8 items-center rounded-full bg-accent-weak px-3 type-caption font-medium text-accent-dark">
              {name}
            </li>
          ))}
          {names.length > SHOWN && (
            <li className="inline-flex h-8 items-center px-1 type-caption text-muted">외 {names.length - SHOWN}곳</li>
          )}
        </ul>
      )}
    </div></div>
  );
}
