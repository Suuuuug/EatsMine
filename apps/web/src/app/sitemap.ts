import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/site";

/**
 * 검색엔진 크롤러용 XML 사이트맵.
 * TODO(seo): 팀원 합의 후 지역별 전용 라우트 도입 시 각 여행지 정규 URL을 추가한다.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
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
}
