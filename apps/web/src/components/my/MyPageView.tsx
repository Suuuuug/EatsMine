import Link from "next/link";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { Icon } from "@/components/icon/Icon";
import { RecordLinks } from "@/components/my/RecordLinks";
import { ReviewList } from "@/components/my/ReviewList";
import { LargeTitleBar } from "@/components/nav/LargeTitleBar";
import { ScrollActivity } from "@/components/scroll/ScrollActivity";
import { GlassCard } from "@/components/ui";
import { formatSince } from "@/lib/my-page/format";
import type { MyPageData } from "@/types/my-page";

type MyPageViewProps = {
  data: MyPageData;
  /** 로그인 후 화면을 미리 볼 때 true. 실제 인증은 아직 연결되지 않았다. */
  member: boolean;
};

export function MyPageView({ data, member }: MyPageViewProps) {
  const { profile, regionVisits, foodCollection, reviews } = data;

  return (
    <div className="em-theme flex flex-1">
      <ScrollActivity />
      <aside className="hidden w-60 shrink-0 px-4 py-6 lg:block">
        <Link href="/" className="pressable mb-10 flex min-h-11 items-center gap-2 rounded-button px-3 font-semibold">
          <Icon name="eatsmine" size={24} /> EatsMine
        </Link>
        <nav aria-label="마이페이지 둘러보기" className="flex flex-col gap-1">
          <a href="#my-records" className="pressable flex min-h-11 items-center rounded-button px-3 text-sm font-medium">내 기록</a>
          <a href="#my-reviews-title" className="pressable flex min-h-11 items-center rounded-button px-3 text-sm font-medium">내가 남긴 후기</a>
          <a href="#privacy-title" className="pressable flex min-h-11 items-center rounded-button px-3 text-sm font-medium">공개 범위</a>
        </nav>
      </aside>
      <main className="my-page mx-auto flex min-w-0 w-full max-w-2xl flex-1 flex-col break-keep text-foreground lg:max-w-none 2xl:max-w-7xl">
        <div className="flex flex-col gap-8 pb-8 lg:grid lg:grid-cols-2 lg:grid-rows-[min-content_min-content_min-content_min-content_1fr] lg:items-start lg:gap-x-10 lg:gap-y-0 lg:px-8 lg:pt-12">
          <div className="lg:col-start-1 lg:row-start-1"><LargeTitleBar title="마이페이지" /></div>
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
          <div className="mx-4 lg:col-start-1 lg:row-start-3 lg:mx-0 lg:mt-8">
            <RecordLinks regionCount={regionVisits.length} foodCount={foodCollection.length} />
          </div>
          <div className="mx-4 lg:col-start-2 lg:row-span-5 lg:row-start-1 lg:mx-0 lg:[&_h2]:min-h-10">
            <ReviewList reviews={reviews} />
          </div>
          <section aria-labelledby="privacy-title" className="mx-4 flex flex-col gap-2 lg:col-start-1 lg:row-start-4 lg:mx-0 lg:mt-8">
            <h2 id="privacy-title" className="scroll-mt-20 type-section">공개 범위</h2>
            <p className="type-body text-muted">공개 설정과 기록 공유를 준비하고 있어요</p>
          </section>
        </div>
      </main>
    </div>
  );
}
