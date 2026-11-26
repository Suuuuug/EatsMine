import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SkeletonRow, actionButtonClass } from "@/components/em";
import { Icon } from "@/components/icon/Icon";
import { Sidebar } from "@/components/layout/Sidebar";
import { RegionDetailLiveSection } from "@/components/regions/RegionDetailLiveSection";
import { ScrollActivity } from "@/components/scroll/ScrollActivity";
import { GlassCard } from "@/components/ui";
import {
  ALL_REGIONS,
  buildRegionJsonLd,
  getFoodsForRegion,
  getRegionByCode,
  getRegionSeoMeta,
  getSiblingRegions,
  regionPath,
  toRegionItem,
} from "@/lib/seo/regions";
import { SITE_NAME, serializeJsonLd } from "@/lib/seo/site";

type RegionPageProps = {
  params: Promise<{ regionCode: string }>;
};

/** 빌드 시 전국 230개 시·군·구 전용 페이지를 정적으로 생성한다. */
export function generateStaticParams(): { regionCode: string }[] {
  return ALL_REGIONS.map((region) => ({ regionCode: region.code }));
}

export async function generateMetadata({
  params,
}: RegionPageProps): Promise<Metadata> {
  const { regionCode } = await params;
  const region = getRegionByCode(regionCode);

  if (!region) {
    return {
      title: `지역을 찾을 수 없어요 | ${SITE_NAME}`,
      robots: { index: false, follow: false },
    };
  }

  const meta = getRegionSeoMeta(region);

  return {
    title: meta.title,
    description: meta.description,
    keywords: meta.keywords,
    alternates: {
      canonical: meta.canonicalPath,
    },
    openGraph: {
      type: "website",
      locale: "ko_KR",
      siteName: SITE_NAME,
      title: meta.title,
      description: meta.description,
      url: meta.canonicalUrl,
    },
    twitter: {
      card: "summary",
      title: meta.title,
      description: meta.description,
    },
  };
}

export default async function RegionDetailPage({ params }: RegionPageProps) {
  const { regionCode } = await params;
  const region = getRegionByCode(regionCode);

  if (!region) {
    notFound();
  }

  const foods = getFoodsForRegion(region.code);
  const siblings = getSiblingRegions(region.code);
  const jsonLd = buildRegionJsonLd(region, foods);
  const regionItem = toRegionItem(region);
  const mapHref = `/?region=${encodeURIComponent(region.code)}`;
  const provinceMapHref =
    siblings.length > 0
      ? `/?province=${encodeURIComponent(region.parentCode)}`
      : "/";

  return (
    <div className="em-theme explore-backdrop relative min-h-dvh pb-20 md:pb-12 md:pl-[76px]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <ScrollActivity />
      <Suspense fallback={null}>
        <Sidebar />
      </Suspense>

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 py-5 md:px-8 md:py-9">
        {/* 브레드크럼 */}
        <nav
          aria-label="현재 위치"
          className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-muted"
        >
          <Link
            href="/"
            className="rounded-input hover:text-foreground hover:underline underline-offset-4 focus-ring"
          >
            전국 맛집 지도
          </Link>
          <Icon name="chevron-right" size={13} className="shrink-0 opacity-60" />
          <Link
            href={provinceMapHref}
            className="rounded-input hover:text-foreground hover:underline underline-offset-4 focus-ring"
          >
            {region.provinceName}
          </Link>
          {region.parentCode !== "36" && (
            <>
              <Icon
                name="chevron-right"
                size={13}
                className="shrink-0 opacity-60"
              />
              <span aria-current="page" className="font-semibold text-foreground">
                {region.name}
              </span>
            </>
          )}
        </nav>

        {/* 지역 히어로 섹션 */}
        <header className="flex flex-col gap-5">
          <GlassCard className="flex flex-col gap-5 p-6 md:p-8">
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-accent-weak px-2.5 py-0.5 text-xs font-semibold text-accent-dark">
                  <Icon name="pin" size={12} />
                  <span>{region.provinceOfficialName}</span>
                </span>
                {region.isPopular && (
                  <span className="inline-flex items-center rounded-full border border-line bg-surface/80 px-2.5 py-0.5 text-xs font-medium text-muted">
                    인기 국내 여행지
                  </span>
                )}
              </div>

              <h1 className="type-title text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {region.fullName} 여행 맛집 가이드
              </h1>
              <p className="type-body max-w-2xl text-muted">
                {region.summary}. {region.fullName}의 추천 식당, 업종별 맛집,
                공유 영토 순위를 한눈에 살펴보고 지도에서 바로 탐색해 보세요.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href={mapHref}
                className={actionButtonClass({ variant: "fill", size: "md" })}
              >
                <Icon name="map" size={16} />
                <span>지도에서 바로 보기</span>
              </Link>
              <Link
                href="/dictionary"
                className={actionButtonClass({ variant: "tinted", size: "md" })}
              >
                <Icon name="dex" size={16} />
                <span>제철음식 도감</span>
              </Link>
            </div>
          </GlassCard>
        </header>

        {/* 이 지역 추천 제철음식 (산지 매칭이 있는 경우 SSR 표시) */}
        {foods.length > 0 && (
          <section
            aria-labelledby="region-foods-heading"
            className="flex flex-col gap-3"
          >
            <div className="flex items-baseline justify-between gap-2">
              <h2 id="region-foods-heading" className="type-section">
                {region.name} 추천 제철음식
              </h2>
              <Link
                href="/dictionary"
                className="inline-flex items-center gap-1 text-xs font-semibold text-accent-dark hover:underline underline-offset-4 focus-ring"
              >
                <span>도감 전체 보기</span>
                <Icon name="chevron-right" size={14} />
              </Link>
            </div>

            <ul className="grid gap-3 sm:grid-cols-2">
              {foods.map((food) => {
                const foodHref = food.slug
                  ? `/dictionary?food=${encodeURIComponent(food.slug)}&regionCode=${encodeURIComponent(region.code)}`
                  : "/dictionary";

                return (
                <li key={food.name}>
                  <Link
                    href={foodHref}
                    className="pressable block h-full rounded-card focus-ring"
                  >
                    <GlassCard className="flex h-full items-start gap-3.5 p-4 transition-colors hover:border-accent/40">
                      {food.slug ? (
                        <div className="flex size-14 shrink-0 items-center justify-center rounded-[12px] bg-fill">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`/images/foods/${food.slug}.svg`}
                            alt=""
                            width={44}
                            height={44}
                            className="size-11 object-contain"
                          />
                        </div>
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-[15px] font-semibold text-foreground">
                            {food.name}
                          </h3>
                          <span className="rounded-full bg-accent-weak px-2 py-0.5 text-[11px] font-medium text-accent-dark">
                            {food.seasonLabel}
                          </span>
                        </div>
                        <p className="mt-1 text-xs font-medium text-accent-dark">
                          {food.reason}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-muted">
                          {food.description}
                        </p>
                      </div>
                    </GlassCard>
                  </Link>
                </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* 실시간 인기 맛집 목록 & 공유 영토 현황 */}
        <Suspense
          fallback={
            <GlassCard className="p-4">
              {Array.from({ length: 3 }, (_, idx) => (
                <SkeletonRow key={idx} />
              ))}
            </GlassCard>
          }
        >
          <RegionDetailLiveSection region={regionItem} />
        </Suspense>

        {/* 같은 시·도의 다른 여행지 내부 링크 (탐색 + 검색엔진 색인 연결) */}
        {siblings.length > 0 && (
          <section
            aria-labelledby="sibling-regions-heading"
            className="flex flex-col gap-3"
          >
            <div className="flex items-baseline justify-between gap-2">
              <h2 id="sibling-regions-heading" className="type-section">
                {region.provinceName} 다른 여행지
              </h2>
              <span className="type-caption text-muted tabular-nums">
                {siblings.length}곳
              </span>
            </div>

            <GlassCard className="p-4 md:p-5">
              <ul className="flex flex-wrap gap-2">
                {siblings.map((sibling) => (
                  <li key={sibling.code}>
                    <Link
                      href={regionPath(sibling.code)}
                      className="pressable inline-flex min-h-9 items-center gap-1 rounded-full border border-line bg-surface/80 px-3.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-accent hover:bg-accent-weak hover:text-accent-dark focus-ring"
                    >
                      <span>{sibling.name}</span>
                      {sibling.isPopular && (
                        <span
                          aria-label="인기 여행지"
                          className="size-1.5 rounded-full bg-accent"
                        />
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </GlassCard>
          </section>
        )}
      </main>
    </div>
  );
}
