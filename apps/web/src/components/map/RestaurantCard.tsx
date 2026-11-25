"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { formatReviewSummary } from "@/lib/map/home-contract";

export type RestaurantCardProps = {
  name: string;
  address: string;
  genre: string | null;
  rankNational: number | null;
  estimatedHours: { start: string; end: string } | null;
  merUrl: string | null;
  reviewsHref: string | null;
  onReviewsClick?: () => void;
  /** 별도의 사진 조회 계약이 제공한 주소. 잇플 식당 응답에는 이 필드가 없다. */
  photoUrl?: string | null;
  /** 실제 사용자 후기 조회 계약에서 제공한 집계와 대표 후기. */
  reviews?: { average: number; count: number; excerpt?: string | null } | null;
};

export function RestaurantCard({ name, address, genre, rankNational, estimatedHours, merUrl, reviewsHref, onReviewsClick, photoUrl, reviews }: RestaurantCardProps) {
  const [failedPhoto, setFailedPhoto] = useState(false);
  const hasPhoto = typeof photoUrl === "string" && (/^(https:\/\/|\/(?!\/))/i.test(photoUrl)) && !failedPhoto;
  const reviewLabel = formatReviewSummary(reviews ?? null);
  const reviewContent = <><span className="block type-caption font-semibold">{reviewLabel ?? "후기 정보를 준비하고 있어요"}</span>{reviewLabel && reviews?.excerpt && <span className="mt-1 block line-clamp-3 type-body">{reviews.excerpt}</span>}<span className="mt-2 block type-caption font-semibold text-accent-dark underline underline-offset-4">후기 보기 <span aria-hidden="true">›</span></span></>;
  const reviewClass = "pressable block min-h-11 w-full rounded-input py-2 text-left focus-ring";
  return (
    <article className="flex flex-col gap-3 py-5">
      {hasPhoto && <div className="relative aspect-[16/9] overflow-hidden rounded-card bg-fill">
        <Image src={photoUrl} alt="" fill unoptimized className="object-cover" sizes="(max-width: 1024px) 90vw, 380px" onError={() => setFailedPhoto(true)} />
      </div>}
      <div>
        <h2 className="type-row font-semibold">{name}</h2>
        <p className="mt-1 type-caption text-muted">{address}</p>
        {genre && <p className="mt-1 type-caption">{genre}</p>}
      </div>
      {onReviewsClick ? <button type="button" className={reviewClass} onClick={onReviewsClick}>{reviewContent}</button> : reviewsHref ? <Link className={reviewClass} href={reviewsHref}>{reviewContent}</Link> : <div className="py-2"><span className="type-caption text-muted">후기 정보를 준비하고 있어요</span></div>}
      {rankNational != null && <p className="type-caption text-muted">전국 매출 상위 {rankNational}%</p>}
      {estimatedHours && <p className="type-caption text-muted">영업 예상 시간 {estimatedHours.start}–{estimatedHours.end}</p>}
      <div className="flex flex-wrap items-center gap-4">
        {merUrl && <a className="pressable inline-flex min-h-11 items-center rounded-input font-semibold text-accent-dark focus-ring" href={merUrl} target="_blank" rel="noopener">잇플에서 상세 보기</a>}
      </div>
    </article>
  );
}
