import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // 공유 미리보기 이미지가 런타임에 읽는 글꼴·지도·음식 그림은 정적 import가 아니라 Vercel 번들에서 빠질 수 있어 직접 포함한다.
  outputFileTracingIncludes: {
    "/share/\\[id\\]/opengraph-image": [
      "./assets/fonts/Pretendard-Bold.otf",
      "./public/images/maps/korea-territories.svg",
      "./public/images/brand/eatsmine-wordmark-light.svg",
      "./public/images/foods/**/*.svg",
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
