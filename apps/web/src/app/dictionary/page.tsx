import type { Metadata } from "next";
import { DictionaryClient } from "@/components/dictionary/DictionaryClient";
import { Sidebar } from "@/components/layout/Sidebar";
import { ScrollActivity } from "@/components/scroll/ScrollActivity";

export const metadata: Metadata = {
  title: "제철음식 도감 | EatsMine",
};

export default function DictionaryPage() {
  return (
    <div className="em-theme min-h-screen pb-16 md:pb-0 md:pl-[76px]">
      <ScrollActivity />
      <Sidebar />
      <DictionaryClient />
    </div>
  );
}
