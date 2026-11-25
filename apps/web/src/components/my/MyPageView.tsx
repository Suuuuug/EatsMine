import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { CollectionPreview } from "@/components/my/CollectionPreview";
import { RecordSection } from "@/components/my/RecordSection";
import { TerritoryPreview } from "@/components/my/TerritoryPreview";
import regionCodes from "../../../public/images/maps/region-codes.json";
import { Sidebar } from "@/components/layout/Sidebar";
import { ThemeSettings } from "@/components/theme/ThemeSettings";
import { ReviewList } from "@/components/my/ReviewList";
import { ScrollActivity } from "@/components/scroll/ScrollActivity";
import { GlassCard } from "@/components/ui";
import { formatSince } from "@/lib/my-page/format";
import { collectionSummary, territorySummary } from "@/lib/my-page/summary";
import { SEASONAL_FOODS, SAMPLE_COLLECTED_FOOD_IDS } from "@/data/seasonal-foods";
import type { MyPageData } from "@/types/my-page";

type MyPageViewProps = {
  data: MyPageData;
  /** 로그인 후 화면을 미리 볼 때 true. 실제 인증은 아직 연결되지 않았다. */
  member: boolean;
};

export function MyPageView({ data, member }: MyPageViewProps) {
  const { profile, regionVisits, reviews } = data;

  return (
    <div className="em-theme my-backdrop flex min-h-dvh flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0 md:pl-[76px]">
      <ScrollActivity />
      <Sidebar />
      <main className="my-page mx-auto flex min-w-0 w-full max-w-2xl flex-1 flex-col break-keep text-foreground lg:max-w-none 2xl:max-w-7xl">
        <div className="flex flex-col gap-8 pb-8 lg:grid lg:grid-cols-2 lg:grid-rows-[min-content_min-content_min-content_min-content_1fr] lg:items-start lg:gap-x-10 lg:gap-y-0 lg:px-8 lg:pt-12">
          <div className="lg:col-start-1 lg:row-start-1"><h1 className="type-large-title mx-4 pt-7 lg:mx-0 lg:pt-0">마이페이지</h1></div>
          <div className="mx-4 lg:col-start-1 lg:row-start-2 lg:mx-0 lg:mt-3">
            <GlassCard className="flex flex-col gap-4 px-4 py-4">
              {member && (
                <div className="flex items-center gap-4">
                  <div aria-hidden="true" className="flex size-14 shrink-0 items-center justify-center rounded-full bg-surface text-xl font-semibold">
                    {profile.nickname.charAt(0)}
                  </div>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <p className="truncate type-row font-semibold">{profile.nickname}</p>
                    <p className="type-caption text-muted">{formatSince(profile.created_at)}</p>
                  </div>
                </div>
              )}
              {data.isSample && <p className="type-body text-foreground">예시 화면이에요</p>}
              {!member && <div className="w-full sm:max-w-xs"><GoogleSignInButton next="/my" /></div>}
            </GlassCard>
          </div>
          <div className="mx-4 flex flex-col gap-6 lg:col-start-1 lg:row-start-3 lg:mx-0 lg:mt-6">
            <RecordSection id="my-territory" title="내 영토" href="/my/territory" summary={territorySummary(regionVisits.length, regionCodes.territories.length)}>
              <TerritoryPreview visited={regionVisits.map((visit) => String(visit.region_id))} />
            </RecordSection>
            <RecordSection id="my-collection" title="내 도감" href="/dictionary?collection=collected" summary={collectionSummary(SAMPLE_COLLECTED_FOOD_IDS.length, SEASONAL_FOODS.length)}>
              <CollectionPreview />
            </RecordSection>
          </div>
          <div className="mx-4 lg:col-start-2 lg:row-span-5 lg:row-start-1 lg:mx-0 lg:[&_h2]:min-h-10">
            <ReviewList reviews={reviews} />
            <div className="mt-8"><ThemeSettings /></div>
          </div>
          <section aria-labelledby="privacy-title" className="mx-4 flex flex-col gap-2 lg:col-start-1 lg:row-start-4 lg:mx-0 lg:mt-8">
            <h2 id="privacy-title" className="scroll-mt-6 type-section">공개 범위</h2>
            <p className="type-body text-muted">공개 설정과 기록 공유를 준비하고 있어요</p>
          </section>
        </div>
      </main>
    </div>
  );
}
