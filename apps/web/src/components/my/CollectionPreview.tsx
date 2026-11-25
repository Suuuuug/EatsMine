import { FoodTile } from "@/components/em";
import { SEASONAL_FOODS, SAMPLE_COLLECTED_FOOD_IDS } from "@/data/seasonal-foods";
import { pickPreviewFoods } from "@/lib/my-page/summary";

const PREVIEW_COUNT = 10;

/** 도감 미리보기. 모은 음식은 원색, 아직인 음식은 흑백 타일 한 줄. collectedNames가 없으면 예시 기록으로 그린다. */
export function CollectionPreview({ collectedNames }: { collectedNames?: readonly string[] }) {
  const ids = collectedNames
    ? SEASONAL_FOODS.filter((food) => collectedNames.includes(food.name)).map((food) => food.id)
    : SAMPLE_COLLECTED_FOOD_IDS;
  const tiles = pickPreviewFoods(SEASONAL_FOODS, ids, PREVIEW_COUNT);
  return (
    <ul className="grid flex-1 grid-cols-5 content-evenly gap-x-1 gap-y-3">
      {tiles.map(({ food, collected }) => (
        <li key={food.id} className="min-w-0 text-center">
          <FoodTile name={food.name} src={food.src} collected={collected} imageSize={44} />
        </li>
      ))}
    </ul>
  );
}
