"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ActionButton,
  EmptyState,
  SkeletonRow,
  actionButtonClass,
} from "@/components/em";
import { Icon } from "@/components/icon/Icon";
import { GlassCard } from "@/components/ui";
import {
  MOCK_TERRITORY_OWNERS,
  buildMockSearchResult,
  getSamplePlaceReviews,
} from "@/data/map-mock";
import { genreIllustration } from "@/lib/map/genre-illustration";
import { reviewUrl, validEatplUrl } from "@/lib/map/home-contract";
import { isPreviewMode, toCardReview } from "@/lib/map/map-data";
import { rememberSourceChannel, trackOutbound } from "@/lib/map/outbound";
import {
  useMapRestaurants,
  useTerritoryOwners,
} from "@/lib/map/use-map-data";
import type { RegionItem } from "@/types/map";

const PREVIEW_PLACE_LIMIT = 10;

type RegionDetailLiveSectionProps = {
  region: RegionItem;
};

/**
 * 지역 상세 페이지의 실시간 맛집 목록과 공유 영토 주인 현황 섹션.
 * - API 주소가 설정된 운영 환경에서는 백엔드 `/restaurants` · `/territories` 데이터를 표시한다.
 * - 예시 모드(`?preview=1` 또는 API 미설정)에서는 지도와 동일한 예시 데이터를 표시한다.
 */
export function RegionDetailLiveSection({
  region,
}: RegionDetailLiveSectionProps) {
  const searchParams = useSearchParams();
  const [isPreview] = useState(() =>
    isPreviewMode(process.env.NEXT_PUBLIC_API_URL, searchParams.toString()),
  );
  const apiBase = isPreview ? null : (process.env.NEXT_PUBLIC_API_URL ?? null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    rememberSourceChannel();
  }, []);

  const apiOwners = useTerritoryOwners(apiBase);
  const currentOwner = useMemo(() => {
    const list = isPreview ? MOCK_TERRITORY_OWNERS : apiOwners;
    return list.find((owner) => owner.regionCode === region.code) ?? null;
  }, [isPreview, apiOwners, region.code]);

  const apiSearch = useMapRestaurants(apiBase, region.code, [], attempt);
  const mockResult = useMemo(
    () => (isPreview ? buildMockSearchResult(region) : null),
    [isPreview, region],
  );

  const result = isPreview ? mockResult : apiSearch.result;
  const loading = !isPreview && apiSearch.loading;
  const error = isPreview ? "" : apiSearch.error;
  const allPlaces = result?.items ?? [];
  const visiblePlaces = allPlaces.slice(0, PREVIEW_PLACE_LIMIT);
  const mapHref = isPreview && searchParams.get("preview") === "1"
    ? `/?region=${encodeURIComponent(region.code)}&preview=1`
    : `/?region=${encodeURIComponent(region.code)}`;

  return (
    <div className="flex flex-col gap-6">
      {/* 공유 영토 현황 카드 */}
      <section aria-labelledby="region-territory-heading">
        <GlassCard className="flex items-start gap-3 p-5">
          <span
            aria-hidden="true"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-weak text-accent-dark"
          >
            <Icon name="crown" size={18} />
          </span>
          <div className="flex flex-col gap-0.5">
            <h2
              id="region-territory-heading"
              className="text-sm font-semibold text-foreground"
            >
              {region.fullName} 공유 영토
            </h2>
            {currentOwner ? (
              <p className="text-sm text-muted">
                현재 땅 주인{" "}
                <strong className="font-semibold text-foreground">
                  {currentOwner.ownerNickname}
                </strong>
                {" · "}리뷰{" "}
                <span className="font-semibold text-foreground tabular-nums">
                  {currentOwner.reviewCount}개
                </span>
                {isPreview ? " (예시)" : ""}
              </p>
            ) : (
              <p className="text-sm text-muted">
                아직 땅 주인이 없는 지역이에요. 식당 리뷰를 남겨 첫 땅 주인이
                되어 보세요.
              </p>
            )}
          </div>
        </GlassCard>
      </section>

      {/* 이 지역 추천 맛집 목록 */}
      <section
        aria-labelledby="region-places-heading"
        className="flex flex-col gap-3"
      >
        <div className="flex items-baseline gap-2">
          <h2 id="region-places-heading" className="type-section">
            {region.name} 추천 맛집
          </h2>
          {!loading && !error && allPlaces.length > 0 && (
            <span className="type-caption font-medium text-muted tabular-nums">
              {allPlaces.length}곳{isPreview ? " (예시)" : ""}
            </span>
          )}
        </div>

        {loading ? (
          <GlassCard className="p-4">
            <div aria-busy="true" aria-label="식당 목록을 불러오는 중">
              {Array.from({ length: 4 }, (_, idx) => (
                <SkeletonRow key={idx} />
              ))}
            </div>
          </GlassCard>
        ) : error ? (
          <GlassCard className="p-6">
            <EmptyState
              illustration="load-error"
              message={error}
              action={
                <ActionButton
                  variant="tinted"
                  size="sm"
                  onClick={() => setAttempt((n) => n + 1)}
                >
                  다시 시도
                </ActionButton>
              }
            />
          </GlassCard>
        ) : visiblePlaces.length === 0 ? (
          <GlassCard className="p-6">
            <EmptyState
              illustration="empty-search"
              message="이 지역의 식당 정보를 찾지 못했어요."
              action={
                <Link
                  href={mapHref}
                  className={actionButtonClass({ variant: "tinted", size: "sm" })}
                >
                  지도에서 둘러보기
                </Link>
              }
            />
          </GlassCard>
        ) : (
          <>
            <ul
              aria-label={`${region.fullName} 추천 맛집 목록`}
              className="grid gap-3 md:grid-cols-2"
            >
              {visiblePlaces.map((place) => {
                const sample = isPreview
                  ? getSamplePlaceReviews(place)
                  : null;
                const cardReview = sample
                  ? {
                      average: sample.averageRating,
                      count: sample.reviewCount,
                      excerpt: sample.featuredReview.content,
                    }
                  : toCardReview(place.reviewSummary);
                const safeEatplUrl = validEatplUrl(place.merUrl);
                const reviewsHref = reviewUrl(
                  place.id,
                  region.code,
                  null,
                  place.name,
                );

                return (
                  <li key={place.id}>
                    <GlassCard className="flex h-full flex-col justify-between gap-3 p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[12px] bg-fill">
                          {place.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={place.imageUrl}
                              alt=""
                              className="size-full object-cover"
                            />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={genreIllustration(place.genre)}
                              alt=""
                              width={56}
                              height={56}
                              loading="lazy"
                              className="size-14 object-contain"
                            />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <h3 className="truncate text-[15px] font-semibold tracking-tight text-foreground">
                              {safeEatplUrl ? (
                                <a
                                  href={safeEatplUrl}
                                  target="_blank"
                                  rel="noopener"
                                  onClick={() =>
                                    trackOutbound(
                                      safeEatplUrl,
                                      "list",
                                      region.code,
                                    )
                                  }
                                  className="rounded-input hover:underline underline-offset-4 focus-ring"
                                >
                                  {place.name}
                                  <span className="sr-only">
                                    {" "}
                                    (가게 상세, 새 창)
                                  </span>
                                </a>
                              ) : (
                                place.name
                              )}
                            </h3>
                            {place.genre && (
                              <span className="shrink-0 text-[11px] font-medium text-muted">
                                {place.genre}
                              </span>
                            )}
                          </div>

                          <p className="mt-0.5 truncate text-xs text-muted">
                            {place.address}
                          </p>

                          {(place.rankNational != null ||
                            place.estimatedHours) && (
                            <p className="mt-1.5 truncate text-[11px] text-muted tabular-nums">
                              {[
                                place.rankNational != null
                                  ? `전국 상위 ${place.rankNational.toFixed(1)}%`
                                  : null,
                                place.estimatedHours
                                  ? `${place.estimatedHours.start}–${place.estimatedHours.end}`
                                  : null,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          )}

                          {cardReview && (
                            <p className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-foreground tabular-nums">
                              <Icon
                                name="star"
                                size={12}
                                className="shrink-0 text-star"
                              />
                              <span>
                                {cardReview.average.toFixed(1)} · 리뷰{" "}
                                {cardReview.count}개
                              </span>
                            </p>
                          )}
                        </div>
                      </div>

                      {cardReview?.excerpt && (
                        <p className="line-clamp-2 text-xs leading-relaxed text-muted">
                          {cardReview.excerpt}
                        </p>
                      )}

                      {reviewsHref && (
                        <div className="flex items-center justify-between gap-2 border-t border-line/60 pt-2">
                          <Link
                            href={reviewsHref}
                            className="pressable inline-flex min-h-8 items-center gap-0.5 rounded-input text-xs font-semibold text-accent-dark underline underline-offset-4 focus-ring"
                          >
                            <span>리뷰 보기</span>
                            <span aria-hidden="true">›</span>
                          </Link>
                          {safeEatplUrl && (
                            <a
                              href={safeEatplUrl}
                              target="_blank"
                              rel="noopener"
                              onClick={() =>
                                trackOutbound(safeEatplUrl, "list", region.code)
                              }
                              className="pressable inline-flex min-h-8 items-center gap-1 rounded-input text-xs font-medium text-muted hover:text-foreground focus-ring"
                            >
                              <span>잇플 상세</span>
                              <Icon name="external" size={12} />
                            </a>
                          )}
                        </div>
                      )}
                    </GlassCard>
                  </li>
                );
              })}
            </ul>

            <div className="flex flex-col items-center gap-2 pt-2">
              {allPlaces.length > visiblePlaces.length && (
                <Link
                  href={mapHref}
                  className={actionButtonClass({ variant: "tinted", size: "sm" })}
                >
                  <span>
                    나머지 {allPlaces.length - visiblePlaces.length}곳 더 보기
                  </span>
                  <Icon name="chevron-right" size={14} />
                </Link>
              )}
              {result?.source && (
                <p className="text-[11px] text-muted">{result.source}</p>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
