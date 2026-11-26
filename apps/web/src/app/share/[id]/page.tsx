import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState, FoodTile, actionButtonClass } from "@/components/em";
import { Sidebar } from "@/components/layout/Sidebar";
import { TerritoryPreview } from "@/components/my/TerritoryPreview";
import { GlassCard } from "@/components/ui";
import { SEASONAL_FOODS } from "@/data/seasonal-foods";
import { fetchSharedView, recordLine, shareMessage, shareTitle, type SharedView } from "@/lib/share/share";

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "";

type Props = { params: Promise<{ id: string }> };

async function load(id: string): Promise<SharedView | null | "error"> {
  try {
    return await fetchSharedView(apiBase, id);
  } catch {
    return "error";
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const view = await load(id);
  if (!view || view === "error") return { title: "공유한 기록 | EatsMine", robots: { index: false } };
  const title = `${shareTitle(view)} | EatsMine`;
  const description = shareMessage(view);
  // 공유 화면은 개인 기록이라 검색에 올리지 않는다. 링크 미리보기(OG)는 opengraph-image가 만든다.
  return { title, description, robots: { index: false }, openGraph: { title, description }, twitter: { card: "summary_large_image", title, description } };
}

/** 공유 링크로 들어온 사람이 보는 화면: 보낸 사람의 영토·도감 카드 한 장과 EatsMine을 시작하는 버튼 하나. */
export default function SharePage({ params }: Props) {
  return (
    <div className="em-theme my-backdrop min-h-dvh pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0 md:pl-[76px]">
      <Suspense fallback={null}>
        <Sidebar />
      </Suspense>
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 break-keep px-4 pt-4 pb-8 lg:pt-12">
        <Suspense fallback={<p role="status" className="type-body">불러오는 중이에요</p>}>
          <SharedRecord params={params} />
        </Suspense>
      </main>
    </div>
  );
}

async function SharedRecord({ params }: Props) {
  const { id } = await params;
  const view = await load(id);

  if (!view || view === "error") {
    return (
      <GlassCard>
        <EmptyState
          illustration="load-error"
          message={view === "error" ? "기록을 불러오지 못했어요. 잠시 뒤에 다시 열어 주세요." : "공유를 그만뒀거나 없는 링크예요"}
          action={
            <Link href="/" className={actionButtonClass({ variant: "tinted" })}>
              EatsMine 둘러보기
            </Link>
          }
        />
      </GlassCard>
    );
  }

  const foods =
    view.type === "collection" ? SEASONAL_FOODS.filter((food) => view.foods.some((item) => item.name === food.name)) : [];

  return (
    <>
      <h1 className="type-title">{shareTitle(view)}</h1>
      <GlassCard className="flex flex-col gap-4 p-4 lg:p-6">
        <p className="type-row font-semibold">{recordLine(view)}</p>
        {view.type === "territory" ? (
          <TerritoryPreview visited={view.regionCodes} stacked />
        ) : foods.length > 0 ? (
          <ul className="grid grid-cols-5 gap-x-1 gap-y-4 sm:grid-cols-6">
            {foods.map((food) => (
              <li key={food.id} className="min-w-0 text-center">
                <FoodTile name={food.name} src={food.src} collected imageSize={48} />
              </li>
            ))}
          </ul>
        ) : null}
      </GlassCard>
      {/* 들어온 사람의 다음 행동 하나: 나도 시작하기 */}
      <Link href={view.type === "territory" ? "/" : "/dictionary"} className={actionButtonClass({ size: "lg", block: true })}>
        {view.type === "territory" ? "나도 내 영토 칠하기" : "나도 제철음식 모으기"}
      </Link>
    </>
  );
}
