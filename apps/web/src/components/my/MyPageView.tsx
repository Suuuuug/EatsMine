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
      <main className="my-page mx-auto flex min-w-0 w-full max-w-2xl flex-1 flex-col break-keep text-foreground lg:max-w-none">
        {/* 제목은 두 열 위에 한 번만 둔다. 모바일은 한 줄로 쌓고, PC는 같은 폭의 두 열로 나눈다. */}
        <div className="flex flex-col gap-8 pt-4 pb-8 lg:px-8 lg:pt-8 2xl:px-12">
          <h1 className="sr-only">마이페이지</h1>
          <div className="contents lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-8 lg:gap-y-8 2xl:gap-x-12">
            <div className="contents lg:flex lg:flex-col lg:gap-8">
              <section aria-labelledby="my-profile" className="order-1 mx-4 flex flex-col gap-1 lg:mx-0">
                <div className="flex min-h-11 items-center">
                  <h2 id="my-profile" className="scroll-mt-6 type-section text-foreground">내 프로필</h2>
                </div>
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
                  {!member && <div className="w-full"><GoogleSignInButton next="/my" /></div>}
                </GlassCard>
              </section>
              <div className="order-2 mx-4 lg:mx-0">
                <RecordSection id="my-territory" title="내 영토" href="/my/territory" summary={territorySummary(regionVisits.length, regionCodes.territories.length)}>
                  <TerritoryPreview visited={regionVisits.map((visit) => String(visit.region_id))} />
                </RecordSection>
              </div>
            </div>
            <div className="contents lg:flex lg:flex-col lg:gap-8">
              <div className="order-4 mx-4 lg:order-1 lg:mx-0 lg:[&_h2]:flex lg:[&_h2]:min-h-11 lg:[&_h2]:items-center">
                <ReviewList reviews={reviews} />
              </div>
              <div className="order-3 mx-4 lg:order-2 lg:mx-0">
                <RecordSection id="my-collection" title="내 도감" href="/dictionary?collection=collected" summary={collectionSummary(SAMPLE_COLLECTED_FOOD_IDS.length, SEASONAL_FOODS.length)}>
                  <CollectionPreview />
                </RecordSection>
              </div>
            </div>
            {/* 설정 줄: 화면 모드와 공개 범위를 한 줄에 나란히 둔다. */}
            <div className="order-5 mx-4 lg:mx-0 lg:[&_section]:gap-1 lg:[&_h2]:flex lg:[&_h2]:min-h-11 lg:[&_h2]:items-center">
              <ThemeSettings />
            </div>
            <section aria-labelledby="privacy-title" className="order-6 mx-4 flex flex-col gap-1 lg:mx-0 lg:[&_h2]:flex lg:[&_h2]:min-h-11 lg:[&_h2]:items-center">
              <h2 id="privacy-title" className="scroll-mt-6 type-section">공개 범위</h2>
              <p className="type-body text-muted">공개 설정과 기록 공유를 준비하고 있어요</p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
