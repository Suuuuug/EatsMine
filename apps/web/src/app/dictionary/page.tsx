import type { Metadata } from "next";
import { Suspense } from "react";
import { DictionaryClient } from "@/components/dictionary/DictionaryClient";
import { Sidebar } from "@/components/layout/Sidebar";
import { ScrollActivity } from "@/components/scroll/ScrollActivity";
import { SEASONAL_FOODS } from "@/data/seasonal-foods";
import { SITE_URL, serializeJsonLd } from "@/lib/seo/site";

const DICTIONARY_DESCRIPTION =
  "봄·여름·가을·겨울 계절별 제철음식 20종과 대표 산지 여행지를 한눈에! 논산 딸기, 통영 굴, 포항 과메기, 제주 귤 등 국내 제철 미식 여행 코스를 찾아보세요.";

export const metadata: Metadata = {
  title: "제철음식 도감 · 계절별 국내 여행 먹거리 | EatsMine",
  description: DICTIONARY_DESCRIPTION,
  alternates: {
    canonical: "/dictionary",
  },
  openGraph: {
    title: "제철음식 도감 · 계절별 국내 여행 먹거리 | EatsMine",
    description: DICTIONARY_DESCRIPTION,
    url: `${SITE_URL}/dictionary`,
  },
};

const dictionaryJsonLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "국내 제철음식 도감 및 산지 여행지",
  description: DICTIONARY_DESCRIPTION,
  itemListElement: SEASONAL_FOODS.map((food, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: `${food.name} (${food.seasonLabel})`,
    description: `${food.regions.join(" · ")} 대표 제철 먹거리`,
  })),
};

export default function DictionaryPage() {
  return (
    <div className="em-theme season-backdrop min-h-screen pb-16 md:pb-0 md:pl-[76px]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(dictionaryJsonLd) }}
      />
      <ScrollActivity />
      <Sidebar />
      <Suspense fallback={<p className="px-4 py-10">도감을 불러오고 있어요</p>}>
        <DictionaryClient />
      </Suspense>
    </div>
  );
}
