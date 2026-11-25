import { FoodTile } from "@/components/em";
import { SEASONAL_FOODS, SAMPLE_COLLECTED_FOOD_IDS } from "@/data/seasonal-foods";
import { pickPreviewFoods } from "@/lib/my-page/summary";

const PREVIEW_COUNT = 5;

/** 도감 미리보기. 모은 음식은 원색, 아직인 음식은 흑백 타일 한 줄. */
export function CollectionPreview() {
  const tiles = pickPreviewFoods(SEASONAL_FOODS, SAMPLE_COLLECTED_FOOD_IDS, PREVIEW_COUNT);
  return (
    <ul className="grid grid-cols-5 gap-1">
      {tiles.map(({ food, collected }) => (
        <li key={food.id} className="min-w-0 text-center">
          <FoodTile name={food.name} src={food.src} collected={collected} imageSize={44} />
        </li>
      ))}
    </ul>
  );
}
