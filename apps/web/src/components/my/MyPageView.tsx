import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { CollectionPreview } from "@/components/my/CollectionPreview";
import { RecordSection } from "@/components/my/RecordSection";
import { TerritoryPreview } from "@/components/my/TerritoryPreview";
import regionCodes from "../../../public/images/maps/region-codes.json";
import { MySidebar } from "@/components/my/MySidebar";
import { ThemeSetting } from "@/components/my/ThemeSetting";
import { InfoLinks } from "@/components/my/InfoLinks";
import { MySection } from "@/components/my/MySection";
import { SignOutButton } from "@/components/my/SignOutButton";
import { ReviewList } from "@/components/my/ReviewList";
import { ScrollActivity } from "@/components/scroll/ScrollActivity";
import { GlassCard } from "@/components/ui";
import { seasonProgress, territorySummary } from "@/lib/my-page/summary";
import { seasonNames } from "@/lib/assets/catalog";
import { currentMonth, currentSeason } from "@/lib/theme/theme";
import { SEASONAL_FOODS, SAMPLE_COLLECTED_FOOD_IDS } from "@/data/seasonal-foods";
import type { MyPageData } from "@/types/my-page";

type MyPageViewProps = {
  data: MyPageData;
  /** 로그인한 사람의 화면이면 true. */
  member: boolean;
  /** 우리 API를 부를 때 쓰는 로그인 토큰. 미리보기·비로그인은 null. */
  token?: string | null;
  /** 후기를 지운 뒤 영토·도감을 다시 읽는다. 예시 화면은 쓰지 않는다. */
  onReviewDeleted?: () => void;
};

/*
 * 두 열 격자. 같은 줄의 구역은 제목 줄 높이가 같고 카드가 늘어나 위·아래 선이 맞는다.
 * 줄: 프로필 | 화면 모드 · 내 영토 | 내 도감 · 후기 | 공유. 모바일은 order로 영토·도감을 먼저 둔다.
 */
export function MyPageView({ data, member, token = null, onReviewDeleted }: MyPageViewProps) {
  const { profile, regionVisits, foodCollection, reviews } = data;
  // 분류(계절)는 절기 기준(입춘·입하·입추·입동)으로 도감 기본 탭·배경과 같고, 다음 음식은 이번 달 제철을 먼저 권한다.
  const season = currentSeason();
  const collectedIds = data.isSample
    ? SAMPLE_COLLECTED_FOOD_IDS
    : SEASONAL_FOODS.filter((food) => foodCollection.some((item) => item.food_name === food.name)).map((food) => food.id);
  const progress = seasonProgress(SEASONAL_FOODS, collectedIds, season, 10, currentMonth());

  return (
    <div className="em-theme my-backdrop min-h-dvh pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0 md:pl-[76px]">
      <ScrollActivity />
      <MySidebar token={member ? token : null} />
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
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <p className="truncate type-row font-semibold">{profile.nickname}</p>
                    <p className="type-caption text-foreground">
                      {profile.rank_label
                        ? `후기 ${profile.review_count ?? reviews.length}개를 남긴 ${profile.rank_label}`
                        : `후기 ${profile.review_count ?? reviews.length}개를 남겼어요`}
                    </p>
                  </div>
                  {token && <SignOutButton />}
                </div>
              )}
              {data.isSample && member && <p className="type-body">예시로 채운 화면이에요.</p>}
              {!member && (
                <>
                  <p className="type-body">로그인하면 예시 대신 내 기록이 보여요</p>
                  <GoogleSignInButton next="/my" />
                </>
              )}
            </GlassCard>
          </MySection>
          <ThemeSetting className="order-6 lg:order-2" />
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
            summary={
              progress.next
                ? `${seasonNames[season]} 제철음식 ${progress.total}종 중 ${progress.collected}종을 모았어요`
                : `${seasonNames[season]} 제철음식 ${progress.total}종을 다 모았어요`
            }
            className="order-3 lg:order-4"
          >
            <CollectionPreview tiles={progress.collected === 0 ? progress.preview.slice(0, 5) : progress.preview} next={progress.next} />
          </RecordSection>
          <ReviewList reviews={reviews} token={member ? token : null} onDeleted={onReviewDeleted} className="order-4 lg:order-5 lg:col-span-2" />
          <InfoLinks className="order-5 lg:order-6 lg:col-span-2" />
        </div>
      </main>
    </div>
  );
}
