import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { MapExplorerClient } from "@/components/map/MapExplorerClient";
import { ScrollActivity } from "@/components/scroll/ScrollActivity";
import {
  DEFAULT_DESCRIPTION,
  POPULAR_TRAVEL_DESTINATIONS,
  SITE_NAME,
  SITE_URL,
  TRAVEL_PROVINCES,
  serializeJsonLd,
} from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "전국 국내 여행지 맛집 지도 · 미식 여행 | EatsMine",
  description: DEFAULT_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "전국 국내 여행지 맛집 지도 · 미식 여행 | EatsMine",
    description: DEFAULT_DESCRIPTION,
    url: SITE_URL,
  },
};

const homeJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      alternateName: "잇츠마인",
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/android-chrome-512x512.png`,
        width: 512,
        height: 512,
      },
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      alternateName: "잇츠마인",
      description: DEFAULT_DESCRIPTION,
      inLanguage: "ko-KR",
      publisher: { "@id": `${SITE_URL}/#organization` },
      potentialAction: {
        "@type": "SearchAction",
        target: `${SITE_URL}/?region={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "ItemList",
      name: "전국 국내 여행지 맛집 지도",
      description:
        "강원도·제주도·부산·여수·전주·경주 등 국내 인기 여행지별 맛집과 영토 지도",
      itemListElement: POPULAR_TRAVEL_DESTINATIONS.map((dest, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: `${dest.name} 여행 맛집 (${dest.regionLabel})`,
        description: dest.summary,
        url: `${SITE_URL}/?region=${dest.code}`,
      })),
    },
  ],
};

export default function HomePage() {
  return (
    // 모바일: 로고 줄 아래 ~ 하단 탭바 위를 지도 화면이 채우고 페이지 자체는 스크롤하지 않는다(목록만 안쪽 스크롤)
    <div className="em-theme explore-backdrop relative min-h-dvh pb-16 md:pb-0 md:pl-[76px] max-lg:flex max-lg:h-dvh max-lg:flex-col max-lg:overflow-clip">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(homeJsonLd) }}
      />
      <ScrollActivity />
      <Sidebar />
      <Suspense
        fallback={
          <main className="flex h-dvh items-center justify-center text-sm text-muted">
            지도를 불러오고 있어요…
          </main>
        }
      >
        <MapExplorerClient />
      </Suspense>

      {/* 검색엔진 크롤러 및 스크린리더용 전국 시·도 및 대표 여행지 시맨틱 인덱스 */}
      <nav
        aria-label="전국 주요 국내 여행지 바로가기"
        className="sr-only"
      >
        <h2>전국 국내 여행지 맛집 지도</h2>
        <p>{DEFAULT_DESCRIPTION}</p>
        <ul>
          {TRAVEL_PROVINCES.map((province) => (
            <li key={province.code}>
              {province.displayName} 여행 맛집 지도 — {province.summary}
            </li>
          ))}
        </ul>
        <ul>
          {POPULAR_TRAVEL_DESTINATIONS.map((dest) => (
            <li key={dest.code}>
              <Link href={`/?region=${dest.code}`}>
                {dest.name} 여행 맛집 · {dest.regionLabel} — {dest.summary}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
