import Link from "next/link";
import { FoodTile, actionButtonClass } from "@/components/em";
import { foodDetailHref } from "@/lib/my-page/summary";
import type { SeasonalFoodItem } from "@/types/dictionary";

type Tile = { food: SeasonalFoodItem; collected: boolean };

/**
 * 마이 "내 도감": 이번 계절(절기 기준) 제철음식 타일(모은 것은 원색, 아직인 것은 흑백)과 다음 행동 하나.
 * 음식 칸은 모두 눌러서 그 음식의 상세(식당 찾기가 있는 곳)로 간다. 음식마다 버튼을 두지 않고 칸 자체가
 * 눌리는 목록 행 방식이다(TDS ListRow). 주 행동(큰 버튼)은 다음에 모을 음식 하나만 둔다.
 * 전체 도감으로 가는 링크는 도감 탭과 겹치므로 두지 않는다.
 */
export function CollectionPreview({ tiles, next }: { tiles: readonly Tile[]; next: SeasonalFoodItem | null }) {
  return (
    <>
      <ul className="grid flex-1 grid-cols-5 content-evenly gap-x-1 gap-y-3">
        {tiles.map(({ food, collected }) => (
          <li key={food.id} className="min-w-0 text-center">
            <FoodTile name={food.name} src={food.src} collected={collected} imageSize={44} href={foodDetailHref(food.id)} />
          </li>
        ))}
      </ul>
      {next && (
        <Link href={foodDetailHref(next.id)} className={actionButtonClass({ variant: "tinted", block: true })}>
          {next.name} 식당 찾아보기
        </Link>
      )}
    </>
  );
}
