import { Suspense } from "react";
import Link from "next/link";
import { ReviewsBackLink } from "./ReviewsBackLink";
import { ReviewsRestaurantName } from "./ReviewsRestaurantName";
import { cleanRestaurantName, reviewStatusText } from "./reviews-navigation";

type RestaurantReviewsViewProps = {
  /** empty는 공개 리뷰 조회에 성공하고 결과가 없을 때만 사용한다. */
  status: "unavailable" | "empty";
  restaurantName?: string;
};

export function RestaurantReviewsView({ status, restaurantName }: RestaurantReviewsViewProps) {
  const { title, description } = reviewStatusText(status);
  const safeName = cleanRestaurantName(restaurantName ?? null);
  return (
    <main className="mx-auto w-full max-w-2xl px-5 pt-7 pb-[calc(7rem+env(safe-area-inset-bottom))] md:pb-12 md:px-8 md:pt-12">
      <Suspense fallback={<Link href="/" className="focus-ring inline-flex min-h-11 items-center text-accent-dark">식당 찾기로 돌아가기</Link>}>
        <ReviewsBackLink />
      </Suspense>
      <h1 className="mt-5 type-large-title">식당 리뷰</h1>
      {safeName ? <p className="mt-2 type-body text-muted">{safeName}</p> : <Suspense fallback={null}><ReviewsRestaurantName /></Suspense>}
      <section aria-labelledby="reviews-status" className="mt-10 border-t border-line pt-10">
        <h2 id="reviews-status" className="type-title">{title}</h2>
        <p className="mt-3 type-body text-muted [word-break:keep-all]">{description}</p>
      </section>
    </main>
  );
}
