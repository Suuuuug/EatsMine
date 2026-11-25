import { TerritoryMap } from "@/components/em/TerritoryMap";
import regionCodes from "../../../public/images/maps/region-codes.json";
import { getTravelProvinceName } from "@/lib/seo/site";

const SHOWN = 6;

/*
 * 마이페이지용 영토 미리보기(읽기 전용). 지도는 크게 두고, 칠한 곳의 이름을 옆에 적는다.
 * 지도만으로는 작은 시·군·구를 알아보기 어렵기 때문이다.
 */
export function TerritoryPreview({
  visited,
  stacked = false,
  mapHeightClass,
}: {
  visited: readonly string[];
  /** 넓어도 지역 이름을 지도 아래에 둔다 */
  stacked?: boolean;
  /** 지도 칸 높이(시트 안처럼 좁은 곳에서 줄인다) */
  mapHeightClass?: string;
}) {
  const owned = new Set(visited);
  const provinces = new Map(regionCodes.provinces.map((p) => [p.code, getTravelProvinceName(p.code, p.name)]));
  // 같은 이름의 구(중구 등)를 구분하려고 시·도 이름을 앞에 붙인다.
  const names = regionCodes.territories
    .filter((t) => owned.has(t.code))
    .map((t) => `${provinces.get(t.code.slice(0, 2)) ?? ""} ${t.name}`.trim());

  return (
    <div className="@container flex flex-col gap-3"><div className={`flex flex-col gap-3 ${stacked ? "" : "@lg:flex-row @lg:items-center @lg:gap-6"}`}>
      <div className={`min-w-0 ${stacked ? "" : "@lg:flex-1"}`}>
        <TerritoryMap visited={visited} territoryView compact compactHeightClass={mapHeightClass} />
      </div>
      {names.length > 0 && (
        // 누르는 곳이 아니므로 칩으로 그리지 않고 평문 한 줄로 적는다(DESIGN §1: 칩은 필터에만).
        <p className={`type-body text-foreground ${stacked ? "" : "@lg:w-2/5 @lg:flex-none"}`}>
          {names.slice(0, SHOWN).join(", ")}
          {names.length > SHOWN && ` 외 ${names.length - SHOWN}곳`}
        </p>
      )}
    </div></div>
  );
}
