import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon/Icon";
import { Sidebar } from "@/components/layout/Sidebar";
import { TerritoryExplorer } from "@/components/my/TerritoryExplorer";
import { SAMPLE_MY_PAGE } from "@/lib/my-page/sample-data";

export const metadata: Metadata = { title: "내 영토 | EatsMine", description: "나만의 영토 지도를 살펴보세요.", alternates: { canonical: "/my/territory" } };

// 화면 확인용 임시 데이터. 실제 방문 기록·리뷰 집계는 인증과 API가 연결된 뒤 같은 모양으로 바꿔 넘긴다.
const VISITED = SAMPLE_MY_PAGE.regionVisits.map((v) => ({ code: String(v.region_id), label: v.region_name }));
const STATS = Object.fromEntries(
  VISITED.map((v, i) => [v.code, { mine: (i % 3) + 1, others: 9 + ((i * 17) % 41) }]),
);

export default function MyTerritoryPage() {
  return (
    <div className="em-theme my-backdrop min-h-dvh pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0 md:pl-[76px]">
      <Sidebar />
      <main className="flex w-full flex-col gap-6 px-4 pt-4 pb-8 lg:px-8 lg:pt-8 2xl:px-12">
        <header className="flex min-h-11 items-center gap-1">
          <Link href="/my" aria-label="마이페이지로" className="pressable focus-ring -ml-2 inline-flex size-11 items-center justify-center rounded-full text-foreground">
            <Icon name="back" size={22} />
          </Link>
          <h1 className="type-section">내 영토</h1>
        </header>
        <p className="type-body text-muted">예시로 채운 화면이에요.</p>
        <TerritoryExplorer visited={VISITED} stats={STATS} />
      </main>
    </div>
  );
}
