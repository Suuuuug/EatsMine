import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { MapExplorerClient } from "@/components/map/MapExplorerClient";
import { ScrollActivity } from "@/components/scroll/ScrollActivity";
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
  const meta = getRegionSeoMeta(region);
  const jsonLd = buildRegionJsonLd(region, foods);
  const initialRegion = toRegionItem(region);

  return (
    <div className="em-theme explore-backdrop relative min-h-dvh pb-16 md:pb-0 md:pl-[76px] max-lg:flex max-lg:h-dvh max-lg:flex-col max-lg:overflow-clip">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <ScrollActivity />
      <Suspense fallback={null}>
        <Sidebar />
      </Suspense>
      <Suspense
        fallback={
          <main className="flex h-dvh items-center justify-center text-sm text-muted">
            {region.fullName} 지도를 불러오고 있어요…
          </main>
        }
      >
        <MapExplorerClient key={region.code} initialRegion={initialRegion} />
      </Suspense>

      {/* 검색엔진 크롤러 및 스크린리더용 지역 상세 시맨틱 콘텐츠와 내부 링크 */}
      <article
        aria-label={`${region.fullName} 여행 맛집 안내`}
        className="sr-only"
      >
        <h2>{region.fullName} 여행 맛집 지도</h2>
        <p>{meta.description}</p>
        <p>
          행정구역: {region.provinceOfficialName} {region.name}
        </p>

        {foods.length > 0 && (
          <section aria-label={`${region.fullName} 추천 제철음식`}>
            <h3>{region.fullName} 추천 제철음식</h3>
            <ul>
              {foods.map((food) => (
                <li key={food.name}>
                  <Link href="/dictionary">
                    {food.name} ({food.reason}) — {food.description}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {siblings.length > 0 && (
          <nav aria-label={`${region.provinceName} 다른 여행지 바로가기`}>
            <h3>{region.provinceName} 다른 여행지 맛집 지도</h3>
            <ul>
              {siblings.map((sibling) => (
                <li key={sibling.code}>
                  <Link href={regionPath(sibling.code)}>
                    {sibling.fullName} 여행 맛집 지도
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <p>
          <Link href="/">전국 국내 여행지 맛집 지도 홈으로 돌아가기</Link>
        </p>
      </article>
    </div>
  );
}
