"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ActionButton, EmptyState, SearchField } from "@/components/em";
import { regionSearchParams, resolveRegionSelection, searchRegions } from "@/lib/map/region-navigation";
import { RestaurantCard } from "./RestaurantCard";
import { Icon } from "@/components/icon/Icon";
import { buildRestaurantUrl, parseSearch, reviewUrl, validEatplUrl, regionLabel, sortRegions, summarizeReviews } from "@/lib/map/home-contract";
import regionSeed from "@/lib/map/region-seed.json";
import { nearbyMapUrl } from "@/lib/map/nearby";
import { IslandOutlines } from "@/components/map/IslandOutlines";

type Region = { code: string; parentCode: string | null; name: string; fullName: string };
type Place = { id: string; name: string; address: string; genre: string | null; rankNational: number | null; estimatedHours: { start: string; end: string } | null; merUrl: string };
type Result = { items: Place[]; matchedBy?: "keyword" | "genre" };
type Shape = { key: string; viewBox: string; paths: { code: string; d: string }[] };
type MapMeta = { provinces: { code: string; svg: string }[] };
const regions: Region[] = regionSeed;
const apiBase = process.env.NEXT_PUBLIC_API_URL;
const attribution = "eat.pl 잇플 · BC카드 결제 데이터 기반";
// 화면 구성만을 위한 가상 후기. 실제 식당 API 결과와 결합하지 않는다.
const exampleReviews = [
  { rating: 5, text: "따뜻한 음식과 편안한 분위기가 좋았어요." },
  { rating: 4, text: "한 끼를 여유롭게 즐겼어요." },
];

function errorMessage(status: number) {
  if (status === 401 || status === 403) return "식당 정보를 불러올 권한을 확인하고 있어요.";
  if (status === 404) return "이 지역의 식당 정보를 찾지 못했어요.";
  if (status === 429) return "요청이 많아요. 잠시 후 다시 시도해 주세요.";
  if (status === 502 || status === 503) return "식당 정보를 불러올 수 없어요. 잠시 후 다시 시도해 주세요.";
  return "식당 정보를 불러오지 못했어요. 다시 시도해 주세요.";
}

export function HomeMap() {
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const lastHandledSearch = useRef<string | null>(null);
  const [regionQuery, setRegionQuery] = useState("");
  const [nearby, setNearby] = useState<string | null>(null);
  const [sampleLocation, setSampleLocation] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const locationRequest = useRef(0);
  const [preview, setPreview] = useState<"card" | "reviews" | null>(null);
  const [province, setProvince] = useState<Region | null>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [shape, setShape] = useState<Shape | null>(null);
  const [hoveredRegion, setHoveredRegion] = useState<{ code: string; x: number; y: number } | null>(null);
  const hoveredCode = hoveredRegion?.code ?? null;
  const [shapeError, setShapeError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [foodId, setFoodId] = useState<string | null>(null);
  const [unsupportedFood, setUnsupportedFood] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const navigated = useRef(false);
  const children = regions.filter((r) => province ? r.parentCode === province.code : r.parentCode === null);
  const list = sortRegions(children);
  const searchResults = searchRegions(regions, regionQuery);
  const searching = Boolean(regionQuery.trim());
  const shapeKey = province?.code ?? "nation";

  useEffect(() => {
    if (lastHandledSearch.current === search) return;
    const timer = window.setTimeout(() => {
      lastHandledSearch.current = search;
      const params = new URLSearchParams(search);
      setPreview(params.get("preview") === "1" ? (params.get("view") === "reviews" ? "reviews" : "card") : null);
      const query = parseSearch(search);
      setFoodId(query.foodId); setUnsupportedFood(query.unsupportedFood);
      const { region: match, province: parent } = resolveRegionSelection(regions, params);
      setRegionQuery("");
      setNearby(null);
      navigated.current = true;
      setProvince(parent); setRegion(match); setResult(null); setError("");
      setLoading(Boolean(match && apiBase && !query.unsupportedFood)); setInitialized(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const c = new AbortController();
    async function load() {
      try {
        let file = "korea.svg";
        if (province) {
          const response = await fetch("/images/maps/region-codes.json", { signal: c.signal });
          if (!response.ok) throw new Error();
          const meta = await response.json() as MapMeta;
          file = meta.provinces.find((p) => p.code === province.code)?.svg ?? "";
          if (!file) throw new Error();
        }
        const response = await fetch(`/images/maps/${file}`, { signal: c.signal });
        if (!response.ok) throw new Error();
        const parsed = new DOMParser().parseFromString(await response.text(), "image/svg+xml");
        const viewBox = parsed.documentElement.getAttribute("viewBox");
        if (!viewBox || parsed.querySelector("parsererror")) throw new Error();
        const paths = [...parsed.querySelectorAll("path[data-region-code]")].map((p) => ({ code: p.getAttribute("data-region-code") ?? "", d: p.getAttribute("d") ?? "" }));
        setShape({ key: shapeKey, viewBox, paths }); setShapeError("");
      } catch { if (!c.signal.aborted) setShapeError(shapeKey); }
    }
    void load();
    return () => c.abort();
  }, [province, shapeKey]);

  useEffect(() => { if (navigated.current) titleRef.current?.focus({ preventScroll: true }); }, [province, region, preview]);

  useEffect(() => {
    if (!initialized || !region || !apiBase || unsupportedFood || province?.code === "12") return;
    const url = buildRestaurantUrl(apiBase, region.code, foodId);
    if (!url) return;
    const c = new AbortController();
    fetch(url, { signal: c.signal, cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error(errorMessage(response.status));
      const data = await response.json() as Result;
      if (!Array.isArray(data.items)) throw new Error("식당 정보를 불러오지 못했어요. 다시 시도해 주세요.");
      setResult(data); setError("");
    }).catch((e: unknown) => {
      if (!c.signal.aborted) setError(e instanceof Error && (e.message.startsWith("식당") || e.message.startsWith("요청")) ? e.message : "식당 정보를 불러오지 못했어요. 다시 시도해 주세요.");
    }).finally(() => { if (!c.signal.aborted) setLoading(false); });
    return () => c.abort();
  }, [initialized, region, foodId, unsupportedFood, attempt, province]);

  function findNearby() {
    const request = ++locationRequest.current;
    setLocationError("");
    if (!navigator.geolocation) { setLocationError("이 브라우저에서는 위치를 확인할 수 없어요. 지역을 직접 선택해 주세요."); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition((position) => {
      if (request !== locationRequest.current) return;
      setLocating(false);
      const url = nearbyMapUrl(position.coords.latitude, position.coords.longitude);
      if (!url) { setLocationError("위치를 확인할 수 없어요. 지역을 직접 선택해 주세요."); return; }
      setSampleLocation(false); setNearby(url);
    }, (error) => {
      if (request !== locationRequest.current) return;
      setLocating(false);
      setLocationError(error.code === 1 ? "위치 권한을 허용하거나 지역을 직접 선택해 주세요." : "위치를 확인하지 못했어요. 다시 시도하거나 지역을 직접 선택해 주세요.");
    }, { timeout: 10000, maximumAge: 60000 });
  }
  function navigateRegion(nextProvince: Region | null, nextRegion: Region | null) {
    locationRequest.current++; setLocating(false); setLocationError("");
    setRegionQuery(""); setHoveredRegion(null); navigated.current = true;
    // 같은 지역을 다시 고르면 기존 조회 결과를 유지해요.
    if (nextProvince?.code !== province?.code || nextRegion?.code !== region?.code) {
      setProvince(nextProvince); setRegion(nextRegion); setResult(null); setError("");
      setLoading(Boolean(nextRegion && apiBase && !unsupportedFood && nextProvince?.code !== "12"));
    } else {
      requestAnimationFrame(() => titleRef.current?.focus({ preventScroll: true }));
    }
    const url = new URL(window.location.href);
    url.search = regionSearchParams(url.searchParams, nextProvince?.code ?? null, nextRegion?.code ?? null).toString();
    lastHandledSearch.current = url.searchParams.toString();
    if (url.href !== window.location.href) window.history.pushState(null, "", url);
  }
  function chooseProvince(value: Region) {
    navigateRegion(value, null);
  }
  function chooseRegion(value: Region) {
    const parent = regions.find(item => item.code === value.parentCode) ?? null;
    navigateRegion(parent, value);
  }
  function goBack() {
    navigateRegion(region ? province : null, null);
  }
  function clearFood() {
    setUnsupportedFood(false); setFoodId(null); setLoading(Boolean(apiBase && region));
    const url = new URL(window.location.href); url.searchParams.delete("food"); url.searchParams.delete("foodId"); lastHandledSearch.current = url.searchParams.toString(); window.history.replaceState(null, "", url);
  }
  function showPreview(view: "card" | "reviews" | null) {
    const url = view ? `/?preview=1${view === "reviews" ? "&view=reviews" : ""}` : "/";
    navigated.current = true; lastHandledSearch.current = new URL(url, window.location.href).searchParams.toString(); window.history.pushState(null, "", url); setPreview(view);
  }
  if (nearby) return (
    <main className="mx-auto min-h-dvh max-w-[1600px] px-5 pt-20 pb-24 md:px-8">
      <button type="button" className="pressable min-h-11 rounded-input px-2 font-semibold text-accent-dark focus-ring" onClick={() => { locationRequest.current++; setNearby(null); }}>‹ 지역 찾기</button>
      <div className="mt-4 grid gap-7 lg:grid-cols-[minmax(280px,380px)_minmax(0,1fr)]">
        <section aria-label="주변 식당 목록"><h1 className="type-title">내 주변 식당</h1><p className="mt-2 type-caption text-muted">{sampleLocation ? "서울 지도와 식당 정보는 예시예요." : "식당 정보와 지도 표시는 예시예요."}</p><div className="mt-3 divide-y divide-line">{[1, 2].map((number) => <RestaurantCard key={number} name={`예시 식당 ${number}`} address="식당 주소 예시" genre="한식" rankNational={null} estimatedHours={null} merUrl={null} reviewsHref={null} onReviewsClick={() => { setNearby(null); showPreview("reviews"); }} photoUrl="/images/preview/restaurant-example.png" reviews={summarizeReviews(exampleReviews)} />)}</div></section>
        <section aria-label="내 위치 지도" className="relative order-first h-[48vh] min-h-80 overflow-hidden rounded-card border border-line lg:order-last lg:h-[min(75vh,760px)]">
          <iframe title={sampleLocation ? "서울 지도 예시" : "내 위치 주변 지도"} src={nearby} className="h-full w-full border-0" loading="lazy" referrerPolicy="strict-origin-when-cross-origin" />
          <span aria-hidden="true" className="pointer-events-none absolute top-[29%] left-[38%] rounded-button bg-surface px-3 py-2 type-caption font-semibold shadow-float">예시 식당 1</span>
          <span aria-hidden="true" className="pointer-events-none absolute top-[60%] left-[66%] rounded-button bg-surface px-3 py-2 type-caption font-semibold shadow-float">예시 식당 2</span>
        </section>
      </div>
    </main>
  );
  if (preview) return (
    <main className="mx-auto min-h-dvh max-w-md px-5 pt-20 pb-28 md:px-8">
      <button type="button" className="pressable min-h-11 rounded-input px-2 font-semibold text-accent-dark focus-ring" onClick={() => showPreview(preview === "reviews" ? "card" : null)}>‹ {preview === "reviews" ? "식당 카드" : "지역 찾기"}</button>
      <h1 ref={titleRef} tabIndex={-1} className="mt-4 type-title outline-none">{preview === "reviews" ? "식당 후기" : "식당 카드"}</h1>
      <p className="mt-2 type-body text-muted">화면 구성 예시예요. 식당과 후기는 실제 정보가 아니에요.</p>
      {preview === "card" ? <div className="mt-6"><RestaurantCard name="예시 식당" address="서울 중구 · 예시 주소" genre="한식 · 예시" rankNational={null} estimatedHours={null} merUrl={null} reviewsHref={null} onReviewsClick={() => showPreview("reviews")} photoUrl="/images/preview/restaurant-example.png" reviews={summarizeReviews(exampleReviews)} /></div> : <section aria-label="예시 후기 목록" className="mt-8"><h2 className="type-row font-semibold">예시 식당 · 후기 {exampleReviews.length}개</h2><ul className="mt-3 divide-y divide-line">{exampleReviews.map((review, index) => <li key={index} className="py-4"><p className="type-caption font-semibold">사용자 평점 {review.rating}점 · 예시</p><p className="mt-2 type-body">{review.text}</p></li>)}</ul></section>}
    </main>
  );
  const selectedTitle = region?.fullName ?? (province ? regionLabel(province) : "어디에서 먹을까요?");
  const places = result?.items.filter((place) => validEatplUrl(place.merUrl)) ?? [];
  return (
    <main className="mx-auto min-h-dvh max-w-[1600px] px-5 pt-20 pb-24 md:px-8 md:pb-7">
      <div className="mt-6 grid gap-7 lg:grid-cols-[minmax(280px,380px)_minmax(0,1fr)]">
        <section className="min-w-0" aria-label="지역과 식당 목록">
          {(province || region) && <button type="button" onClick={goBack} className="pressable min-h-11 rounded-input px-2 font-semibold text-accent-dark focus-ring">‹ {region && province ? regionLabel(province) : "전국"}</button>}
          <h1 ref={titleRef} tabIndex={-1} className="type-title outline-none">{selectedTitle}</h1>
          <SearchField
            className="mt-4"
            label="시·도 또는 시·군·구 검색"
            placeholder="지역 이름을 입력해 주세요"
            value={regionQuery}
            onValueChange={setRegionQuery}
            aria-controls={searching ? "region-search-results" : undefined}
          />
          {searching ? (
            <div id="region-search-results" className="mt-4">
              <p role="status" className="type-caption">지역 {searchResults.length}곳을 찾았어요.</p>
              {searchResults.length ? (
                <ul aria-label="지역 검색 결과" className="mt-2 divide-y divide-line">
                  {searchResults.map(item => (
                    <li key={item.code}>
                      <button
                        type="button"
                        onClick={() => item.parentCode ? chooseRegion(item) : chooseProvince(item)}
                        className="pressable focus-ring scroll-mb-24 flex min-h-11 w-full items-center justify-between gap-3 rounded-input px-2 py-3 text-left"
                      >
                        <span>{item.fullName}</span><span aria-hidden="true">›</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  illustration="empty-search"
                  message="일치하는 지역이 없어요. 다른 이름으로 검색해 주세요."
                  action={
                    <ActionButton variant="gray" className="scroll-mb-24" onClick={() => {
                      document.querySelector<HTMLInputElement>('input[aria-controls="region-search-results"]')?.focus();
                      setRegionQuery("");
                    }}>검색어 지우기</ActionButton>
                  }
                />
              )}
            </div>
          ) : <>
          {!region ? <>
            <p className="mt-2 type-body text-muted">{province ? "시·군·구를 선택해 주세요." : "지역을 선택해 식당을 찾아보세요."}</p>

            {<ul className="mt-4 divide-y divide-line">{list.map((r) => <li key={r.code}><button type="button" onClick={() => province ? chooseRegion(r) : chooseProvince(r)} className="pressable flex min-h-11 w-full items-center justify-between px-2 py-3 text-left focus-ring"><span>{regionLabel(r)}</span><span aria-hidden>›</span></button></li>)}</ul>}
          </> : <>
            {unsupportedFood ? <div className="mt-4"><p>선택한 음식으로 식당을 찾는 기능을 준비하고 있어요.</p><button type="button" onClick={clearFood} className="pressable mt-2 min-h-11 rounded-input px-3 font-semibold text-accent-dark focus-ring">음식 조건 없이 찾기</button></div> : <>
              {foodId && <p className="mt-2 type-caption text-muted">선택한 음식으로 식당을 찾고 있어요.</p>}
              {!apiBase || province?.code === "12" ? <p className="mt-5 rounded-card bg-fill p-4 type-body">식당 정보 연결을 준비하고 있어요.</p> : loading ? <p className="mt-5" role="status">식당을 찾고 있어요.</p> : error ? <div className="mt-5" role="alert"><p>{error}</p><button type="button" className="pressable mt-3 min-h-11 rounded-button bg-fill px-4 focus-ring" onClick={() => { setError(""); setLoading(true); setAttempt((x) => x + 1); }}>다시 불러오기</button></div> : result ? <>
                {result.matchedBy === "genre" && <p className="mt-4 type-caption text-muted">음식 이름으로 찾은 결과가 없어 관련 업종을 보여드려요. 메뉴 판매 여부는 확인해 주세요.</p>}
                <p className="mt-4 type-row font-semibold">식당 {places.length}곳</p>
                {places.length === 0 ? <p className="mt-4">검색 결과가 없어요. 다른 지역을 선택해 주세요.</p> : <ul className="mt-3 divide-y divide-line">{places.map((place) => <li key={place.id}><RestaurantCard name={place.name} address={place.address} genre={place.genre} rankNational={place.rankNational} estimatedHours={place.estimatedHours} merUrl={place.merUrl} reviewsHref={reviewUrl(place.id, region.code, foodId, place.name)} /></li>)}</ul>}
                <p className="mt-4 type-caption text-muted">{attribution}</p>
              </> : null}
            </>}
          </>}
          </>}
        </section>
        <section aria-label="지역 지도" className="relative order-first min-h-80 rounded-card border border-line bg-surface/40 p-4 lg:order-last">
          {!province && <div className="absolute top-4 right-4 z-10 flex max-w-[min(19rem,80%)] flex-col items-end"><button type="button" onClick={findNearby} disabled={locating} className="glass-bar pressable focus-ring inline-flex min-h-11 items-center gap-2 rounded-button border border-line px-4 font-semibold text-foreground shadow-float"><Icon name="locate" size={18} />{locating ? "위치 확인 중…" : "내 위치"}</button>{locationError && <div className="mt-2 rounded-card border border-line bg-surface p-3 shadow-float"><p role="alert" className="type-caption text-foreground">{locationError}</p><button type="button" className="pressable focus-ring mt-1 min-h-11 px-2 font-semibold text-accent-dark" onClick={() => { setSampleLocation(true); setNearby(nearbyMapUrl(37.5665, 126.978)); }}>위치 없이 화면 보기</button></div>}</div>}
          {region ? <div className="flex min-h-80 flex-col items-center justify-center gap-3 text-center"><p className="type-row font-semibold">{region.fullName}</p><p className="type-body text-muted">식당 위치를 지도에 표시할 수 있도록 준비하고 있어요.</p></div> : shape?.key === shapeKey ? <svg viewBox={shape.viewBox} role="img" aria-label={`${province ? regionLabel(province) : "전국"} 지도`} className="mx-auto h-[min(36vh,320px)] max-w-full md:h-[min(42vh,420px)] lg:h-[min(82vh,900px,calc(100vh-160px))]" onPointerMove={(event) => { const code = (event.target as Element).getAttribute("data-code"); setHoveredRegion(event.pointerType !== "touch" && code && list.some((item) => item.code === code) ? { code, x: Math.min(Math.max(event.clientX, 100), window.innerWidth - 100), y: Math.max(event.clientY - 14, 45) } : null); }} onPointerLeave={() => setHoveredRegion(null)} onClick={(event) => { const code = (event.target as Element).getAttribute("data-code"); const found = children.find((r) => r.code === code); if (found) { if (province) chooseRegion(found); else chooseProvince(found); } }}>{shape.paths.map((path) => <path key={path.code} data-code={path.code} d={path.d} fillRule="evenodd" vectorEffect="non-scaling-stroke" strokeWidth="1" className={`${hoveredCode === path.code ? "fill-map-partial" : "fill-map-empty"} stroke-map-line`} />)}<IslandOutlines province={province?.code ?? null} className={hoveredCode === (province ? "47940" : "47") ? "fill-map-partial" : "fill-map-empty"} /></svg> : <p className="flex min-h-80 items-center justify-center text-muted">{shapeError === shapeKey ? "지도를 불러오지 못했어요. 지역 목록에서 선택해 주세요." : "지도를 불러오고 있어요."}</p>}
          {hoveredRegion && hoveredRegion.code !== "47940" && <div aria-hidden="true" className="glass-bar pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full rounded-input border border-line px-3 py-2 type-caption font-semibold text-foreground shadow-float" style={{ left: hoveredRegion.x, top: hoveredRegion.y }}>{regionLabel(list.find((item) => item.code === hoveredRegion.code)!)}</div>}
        </section>
      </div>
    </main>
  );
}
