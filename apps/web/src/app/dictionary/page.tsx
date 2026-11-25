import type { Metadata } from "next";
import { Suspense } from "react";
import { DictionaryClient } from "@/components/dictionary/DictionaryClient";
import { Sidebar } from "@/components/layout/Sidebar";
import { ScrollActivity } from "@/components/scroll/ScrollActivity";

export const metadata: Metadata = {
  title: "제철음식 도감 | EatsMine",
};

export default function DictionaryPage() {
  return (
    <div className="em-theme season-backdrop min-h-screen pt-16 pb-16 md:pb-0 md:pl-[76px]">
      <ScrollActivity />
      <Sidebar />
      <Suspense fallback={<p className="px-4 py-10">도감을 불러오고 있어요</p>}>
        <DictionaryClient />
      </Suspense>
    </div>
  );
}
