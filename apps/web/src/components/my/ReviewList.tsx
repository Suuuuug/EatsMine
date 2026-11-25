import { ListSection } from "@/components/list/List";
import { GlassCard, StarRating } from "@/components/ui";
import { formatMonthDay } from "@/lib/my-page/format";
import type { MyReview } from "@/types/my-page";

const visibilityLabel = { private: "나만 보기", public: "공개" } as const;

export function ReviewList({ reviews }: { reviews: MyReview[] }) {
  return (
    <ListSection id="my-reviews-title" title="내가 남긴 후기">
      {reviews.length === 0 ? (
        <p className="py-6 type-body text-foreground">아직 남긴 후기가 없어요. 다녀온 맛집에 별점을 남기면 여기에 모여요.</p>
      ) : (
        <GlassCard className="overflow-hidden px-4">
          <ul className="list-divided">
          {reviews.map((review) => (
            <li key={review.id} className="flex flex-col gap-2 py-4">
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="min-w-0 truncate type-row text-foreground">
                  {review.mer_url ? (
                    <a
                      href={review.mer_url}
                      target="_blank"
                      rel="noopener"
                      className="pressable inline-flex min-h-11 items-center"
                    >
                      {review.restaurant_name}
                    </a>
                  ) : (
                    review.restaurant_name
                  )}
                </h3>
                <span className="shrink-0 type-caption text-muted">{visibilityLabel[review.visibility]}</span>
              </div>
              <div className="flex items-center gap-3">
                <StarRating value={review.rating} size={14} />
                <span className="type-caption text-muted tabular-nums">{formatMonthDay(review.visited_at)}</span>
              </div>
              <p className="line-clamp-2 type-body text-foreground/90">{review.content}</p>
            </li>
          ))}
          </ul>
        </GlassCard>
      )}
    </ListSection>
  );
}
