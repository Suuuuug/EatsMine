"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { reviewReturnHref } from "./reviews-navigation";

export function ReviewsBackLink() {
  const search = useSearchParams();
  return (
    <Link href={reviewReturnHref(search)} className="pressable focus-ring -ml-2 inline-flex min-h-11 items-center gap-1 rounded-button px-2 text-sm font-semibold text-accent-dark">
      <span aria-hidden="true">‹</span> 식당 찾기로 돌아가기
    </Link>
  );
}
