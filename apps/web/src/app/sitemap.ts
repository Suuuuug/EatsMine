import type { MetadataRoute } from "next";
import { ALL_REGIONS, regionPath } from "@/lib/seo/regions";
import { SITE_URL } from "@/lib/seo/site";

/**
 * 검색엔진 크롤러용 XML 사이트맵.
 * 기본 페이지와 전국 230개 시·군·구 전용 페이지(`/regions/[regionCode]`) 정규 URL을 제공한다.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/dictionary`,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/my/territory`,
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];

  const regionEntries: MetadataRoute.Sitemap = ALL_REGIONS.map((region) => ({
    url: `${SITE_URL}${regionPath(region.code)}`,
    changeFrequency: "weekly",
    priority: region.isPopular ? 0.85 : 0.7,
  }));

  return [...staticEntries, ...regionEntries];
}
