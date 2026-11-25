"use client";

import { useSearchParams } from "next/navigation";
import { cleanRestaurantName } from "./reviews-navigation";

/** 쿼리 이름은 단순 텍스트로 표시하며 공개 후기 조회의 식별자로 사용하지 않는다. */
export function ReviewsRestaurantName() {
  const name = cleanRestaurantName(useSearchParams().get("name"));
  return name ? <p className="mt-2 type-body text-muted">{name}</p> : null;
}
