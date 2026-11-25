import type { Metadata } from "next";
import { Suspense } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { MapExplorerClient } from "@/components/map/MapExplorerClient";
import { ScrollActivity } from "@/components/scroll/ScrollActivity";

export const metadata: Metadata = {
  title: "지도 | EatsMine",
  description:
    "전국의 지역별 맛집과 공유 영토 땅따먹기를 한 화면에서 탐색해 보세요.",
};

export default function HomePage() {
  return (
    <div className="em-theme explore-backdrop min-h-dvh pb-16 md:pb-0 md:pl-[76px]">
      <ScrollActivity />
      <Sidebar />
      <Suspense
        fallback={
          <main className="flex h-dvh items-center justify-center text-sm text-muted">
            지도를 불러오고 있어요…
          </main>
        }
      >
        <MapExplorerClient />
      </Suspense>
    </div>
  );
}
