import Link from "next/link";
import { FoodTile, actionButtonClass } from "@/components/em";
import type { SeasonalFoodItem } from "@/types/dictionary";

type Tile = { food: SeasonalFoodItem; collected: boolean };

/**
 * 마이 "내 도감": 이번 계절(절기 기준) 제철음식 타일(모은 것은 원색, 아직인 것은 흑백)과 다음 행동 하나.
 * 전체 도감은 도감 탭이 맡으므로 여기서는 같은 화면으로 가는 링크를 두지 않고,
 * 아직 못 모은 음식 하나의 식당 찾기(도감 음식 상세)로만 보낸다.
 */
export function CollectionPreview({ tiles, next }: { tiles: readonly Tile[]; next: SeasonalFoodItem | null }) {
  return (
    <>
      <ul className="grid flex-1 grid-cols-5 content-evenly gap-x-1 gap-y-3">
        {tiles.map(({ food, collected }) => (
          <li key={food.id} className="min-w-0 text-center">
            <FoodTile name={food.name} src={food.src} collected={collected} imageSize={44} />
          </li>
        ))}
      </ul>
      {next && (
        <Link href={`/dictionary?food=${encodeURIComponent(next.id)}`} className={actionButtonClass({ variant: "tinted", block: true })}>
          {next.name} 식당 찾아보기
        </Link>
      )}
    </>
  );
}
