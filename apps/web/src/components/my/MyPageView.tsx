import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { CollectionPreview } from "@/components/my/CollectionPreview";
import { RecordSection } from "@/components/my/RecordSection";
import { TerritoryPreview } from "@/components/my/TerritoryPreview";
import regionCodes from "../../../public/images/maps/region-codes.json";
import { Sidebar } from "@/components/layout/Sidebar";
import { PrivacySettings } from "@/components/my/PrivacySettings";
import { ShareButton } from "@/components/my/ShareButton";
import { ThemeSetting } from "@/components/my/ThemeSetting";
import { MySection } from "@/components/my/MySection";
import { SignOutButton } from "@/components/my/SignOutButton";
import { ReviewList } from "@/components/my/ReviewList";
import { ScrollActivity } from "@/components/scroll/ScrollActivity";
import { GlassCard } from "@/components/ui";
import { formatSince, shareText } from "@/lib/my-page/format";
import { collectionSummary, territorySummary } from "@/lib/my-page/summary";
import { SEASONAL_FOODS, SAMPLE_COLLECTED_FOOD_IDS } from "@/data/seasonal-foods";
import type { MyPageData } from "@/types/my-page";

type MyPageViewProps = {
  data: MyPageData;
  /** 로그인한 사람의 화면이면 true. */
  member: boolean;
  /** 우리 API를 부를 때 쓰는 로그인 토큰. 미리보기·비로그인은 null. */
  token?: string | null;
};

/*
 * 두 열 격자. 같은 줄의 구역은 제목 줄 높이가 같고 카드가 늘어나 위·아래 선이 맞는다.
 * 줄: 프로필 | 화면 모드 · 내 영토 | 내 도감 · 후기 | 공개 범위. 모바일은 order로 영토·도감을 먼저 둔다.
 */
export function MyPageView({ data, member, token = null }: MyPageViewProps) {
  const { profile, regionVisits, foodCollection, reviews } = data;

  return (
    <div className="em-theme my-backdrop min-h-dvh pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0 md:pl-[76px]">
      <ScrollActivity />
      <Sidebar />
      <main className="my-page mx-auto flex min-w-0 w-full max-w-2xl flex-1 flex-col break-keep text-foreground lg:max-w-6xl">
        <h1 className="sr-only">마이페이지</h1>
        <div className="grid grid-cols-1 gap-x-8 gap-y-6 px-4 pt-4 pb-8 lg:grid-cols-2 lg:px-8 lg:pt-8 2xl:gap-x-12">
          <MySection id="my-profile" title="내 프로필" className="order-1">
            <GlassCard className="flex flex-1 flex-col justify-center gap-4 p-4">
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
              {data.isSample && member && <p className="type-body">예시로 채운 화면이에요.</p>}
              {!member && <GoogleSignInButton next="/my" />}
              {member && token && <SignOutButton />}
            </GlassCard>
          </MySection>
          <ThemeSetting className="order-5 lg:order-2" />
          <RecordSection
            id="my-territory"
            title="내 영토"
            href="/my/territory"
            summary={territorySummary(regionVisits.length, regionCodes.territories.length)}
            className="order-2 lg:order-3"
          >
            <TerritoryPreview visited={regionVisits.map((visit) => String(visit.region_id))} />
          </RecordSection>
          <RecordSection
            id="my-collection"
            title="내 도감"
            href="/dictionary?collection=collected"
            summary={collectionSummary(data.isSample ? SAMPLE_COLLECTED_FOOD_IDS.length : foodCollection.length, SEASONAL_FOODS.length)}
            className="order-3 lg:order-4"
          >
            <CollectionPreview collectedNames={data.isSample ? undefined : foodCollection.map((item) => item.food_name)} />
          </RecordSection>
          <ReviewList reviews={reviews} className="order-4 lg:order-5" />
          <div className="order-6 flex min-w-0 flex-col gap-4">
            <PrivacySettings enabled={member} token={token} userId={profile.id} className="flex-1" />
            <ShareButton label="EatsMine 공유하기" text={shareText(data)} />
          </div>
        </div>
      </main>
    </div>
  );
}
