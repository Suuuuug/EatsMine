import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import type { ReactNode } from "react";
import { SEASONAL_FOODS } from "@/data/seasonal-foods";
import { SITE_URL } from "@/lib/seo/site";
import { fetchSharedView, recordLine, shareTitle } from "@/lib/share/share";

// 공유 링크를 메신저에 붙이면 뜨는 미리보기 카드. 보낸 사람의 영토 지도(공개 후기로 칠한 곳)나
// 모은 음식 그림을 사진처럼 보여 준다. 이미지 안은 CSS 변수를 못 쓰므로 tokens.css 라이트 값을 sRGB로 옮겨 적었다.
const COLOR = {
  background: "#f2f6f2", // --color-background (light)
  foreground: "#1b211c", // --color-foreground (light)
  accent: "#287c42", // --color-accent (light)
  mapEmpty: "#e5eadc", // --color-map-empty (light)
  mapFull: "#1e7729", // --color-map-full (light)
  mapLine: "#798573", // --color-map-line (light)
};

export const alt = "EatsMine에서 공유한 영토와 도감";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "";
const root = process.cwd();
const fontBold = readFile(join(root, "assets/fonts/Pretendard-Bold.otf"));
const mapSvg = readFile(join(root, "public/images/maps/korea-territories.svg"), "utf8");
const wordmark = readFile(join(root, "public/images/brand/eatsmine-wordmark-light.svg"));

/** 미리보기 카드에서 칠한 곳이 몇 곳뿐이면 작은 구는 안 보인다. 위치 점을 함께 찍는다(마이 미리보기와 같은 기준). */
const FEW_MARKED = 5;

/** path d의 좌표 상자 가운데(점 찍을 자리). */
function centerOf(d: string): [number, number] | null {
  const nums = d.match(/-?\d+(?:\.\d+)?/g)?.map(Number);
  if (!nums || nums.length < 2) return null;
  let [minX, minY, maxX, maxY] = [Infinity, Infinity, -Infinity, -Infinity];
  for (let i = 0; i + 1 < nums.length; i += 2) {
    minX = Math.min(minX, nums[i]);
    maxX = Math.max(maxX, nums[i]);
    minY = Math.min(minY, nums[i + 1]);
    maxY = Math.max(maxY, nums[i + 1]);
  }
  return [(minX + maxX) / 2, (minY + maxY) / 2];
}

/** 칠한 지역만 채운 전국 지도 SVG를 data URL로. */
async function territoryMap(codes: readonly string[]): Promise<string> {
  const owned = new Set(codes);
  const svg = (await mapSvg)
    .replace(/<title>[\s\S]*?<\/title>|<desc>[\s\S]*?<\/desc>/g, "")
    .replace(/<path id="r-(\d+)"([^>]*?)fill="[^"]*"([^>]*?)stroke="[^"]*"/g, (_m, code: string, a: string, b: string) =>
      owned.has(code)
        ? `<path id="r-${code}"${a}fill="${COLOR.mapFull}"${b}stroke="${COLOR.mapFull}"`
        : `<path id="r-${code}"${a}fill="${COLOR.mapEmpty}"${b}stroke="${COLOR.mapLine}"`,
    );
  let dots = "";
  if (owned.size > 0 && owned.size <= FEW_MARKED) {
    for (const match of svg.matchAll(/<path id="r-(\d+)"[^>]*?\sd="([^"]+)"/g)) {
      const center = owned.has(match[1]) ? centerOf(match[2]) : null;
      if (center) dots += `<circle cx="${center[0]}" cy="${center[1]}" r="195" fill="${COLOR.mapFull}" stroke="${COLOR.background}" stroke-width="48"/>`;
    }
  }
  const withDots = svg.replace("</svg>", `${dots}</svg>`);
  return `data:image/svg+xml;base64,${Buffer.from(withDots).toString("base64")}`;
}

async function foodImage(src: string): Promise<string> {
  const svg = await readFile(join(root, "public", src));
  return `data:image/svg+xml;base64,${svg.toString("base64")}`;
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const view = await fetchSharedView(apiBase, id).catch(() => null);
  const font = await fontBold;

  const title = view ? shareTitle(view) : "EatsMine";
  const message = view ? recordLine(view) : "지역과 제철음식을 칠하며 맛집을 찾아요";

  let visual: ReactNode = null;
  if (view?.type === "territory") {
    visual = <img src={await territoryMap(view.regionCodes)} width={560} height={524} alt="" />;
  } else if (view?.type === "collection") {
    const foods = SEASONAL_FOODS.filter((food) => view.foods.some((item) => item.name === food.name)).slice(0, 9);
    const images = await Promise.all(foods.map((food) => foodImage(food.src)));
    visual = (
      <div style={{ display: "flex", flexWrap: "wrap", width: 480, gap: 24, justifyContent: "center" }}>
        {images.map((src, i) => (
          <img key={foods[i].id} src={src} width={136} height={136} alt="" />
        ))}
      </div>
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "56px 64px",
          background: COLOR.background,
          color: COLOR.foreground,
          fontFamily: "Pretendard",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%", width: 520 }}>
          <img src={`data:image/svg+xml;base64,${(await wordmark).toString("base64")}`} width={196} height={49} alt="EatsMine" />
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", fontSize: 52, lineHeight: 1.2, wordBreak: "keep-all" }}>{title}</div>
            <div style={{ display: "flex", fontSize: 34, lineHeight: 1.4, wordBreak: "keep-all" }}>{message}</div>
          </div>
          {/* 이미지 안 글자는 눌리지 않으므로 행동 문구를 두지 않고 사이트 주소만 적는다 */}
          <div style={{ display: "flex", fontSize: 26, color: COLOR.foreground, opacity: 0.85 }}>{new URL(SITE_URL).host}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 560, height: 524 }}>{visual}</div>
      </div>
    ),
    { ...size, fonts: [{ name: "Pretendard", data: font, weight: 700, style: "normal" }] },
  );
}
