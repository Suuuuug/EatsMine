import type { Metadata } from "next";
import Link from "next/link";
import { Sidebar } from "@/components/layout/Sidebar";
import { TerritoryMap } from "@/components/em/TerritoryMap";

export const metadata: Metadata = { title: "나의 영토 | EatsMine" };

export default function MyTerritoryPage() {
  return <div className="em-theme min-h-dvh pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0 md:pl-[76px]">
    <Sidebar />
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 md:px-8">
      <Link href="/my" className="focus-ring inline-flex min-h-11 w-fit items-center rounded-input px-2 font-medium text-accent-dark">마이페이지로</Link>
      <h1 className="type-title">나의 영토</h1>
      <p className="type-body text-muted">예시로 칠한 지도예요. 내 기록은 로그인 연결 후 볼 수 있어요.</p>
      <p className="type-body">방문 지역 예시 4곳: 서울 강남구, 수원시, 부산 해운대구, 대전 중구</p>
      <TerritoryMap visited={["11680", "41110", "26350", "30140"]} />
    </main>
  </div>;
}
