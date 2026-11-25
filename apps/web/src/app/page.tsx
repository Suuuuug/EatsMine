import type { Metadata } from "next";
import { Suspense } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { HomeMap } from "@/components/map/HomeMap";

export const metadata: Metadata = { title: "지도 | EatsMine" };
export default function Home() {
  return <div className="em-theme explore-backdrop min-h-dvh pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0 md:pl-[76px]"><Sidebar /><Suspense fallback={<main className="p-8">지도를 불러오고 있어요</main>}><HomeMap /></Suspense></div>;
}
