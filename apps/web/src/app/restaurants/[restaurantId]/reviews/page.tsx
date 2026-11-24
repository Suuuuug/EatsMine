import { Suspense } from "react";
import type { Metadata } from "next";
import { Sidebar } from "@/components/layout/Sidebar";
import { RestaurantReviewsView } from "@/components/reviews/RestaurantReviewsView";

export const metadata: Metadata = { title: "식당 후기 | EatsMine" };

export default function RestaurantReviewsPage() {
  return (
    <div className="em-theme min-h-dvh">
      <Suspense fallback={null}><Sidebar /></Suspense>
      <div className="pt-16 md:pl-[76px]"><RestaurantReviewsView status="unavailable" /></div>
    </div>
  );
}
