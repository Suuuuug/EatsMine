"use client";

import { useRef, useState } from "react";
import {
  ActionButton,
  BottomSheet,
  actionButtonClass,
} from "@/components/em";
import { Icon } from "@/components/icon/Icon";
import {
  getSamplePlaceReviews,
  type PlaceReviewItem,
} from "@/data/map-mock";
import type { EatplPlace } from "@/types/map";

const MAX_REVIEW_PHOTOS = 4;

type DraftPhoto = {
  id: string;
  url: string;
  name: string;
};

type RestaurantReviewSheetProps = {
  place: EatplPlace | null;
  userReviews: PlaceReviewItem[];
  onClose: () => void;
  onAddReview: (placeId: string, review: PlaceReviewItem) => void;
};

/**
 * 식당 리뷰 보기 및 작성 시트 (팀 공용 BottomSheet 활용, 백엔드 연동 전 프론트 예시)
 */
export function RestaurantReviewSheet({
  place,
  userReviews,
  onClose,
  onAddReview,
}: RestaurantReviewSheetProps) {
  const [writing, setWriting] = useState(false);
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const [draftPhotos, setDraftPhotos] = useState<DraftPhoto[]>([]);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const summary = place ? getSamplePlaceReviews(place, userReviews) : null;

  const clearDraftPhotos = (revokeUrls: boolean) => {
    if (revokeUrls) {
      for (const photo of draftPhotos) {
        URL.revokeObjectURL(photo.url);
      }
    }
    setDraftPhotos([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    clearDraftPhotos(true);
    setLightboxUrl(null);
    setWriting(false);
    setContent("");
    setRating(5);
    onClose();
  };

  const handleCancelWriting = () => {
    clearDraftPhotos(true);
    setContent("");
    setRating(5);
    setWriting(false);
  };

  const handleFilesSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).filter((file) =>
      file.type.startsWith("image/"),
    );
    event.target.value = "";
    if (files.length === 0) return;

    setDraftPhotos((prev) => {
      const remaining = MAX_REVIEW_PHOTOS - prev.length;
      if (remaining <= 0) return prev;
      const added: DraftPhoto[] = files.slice(0, remaining).map((file, idx) => ({
        id: `photo-${Date.now()}-${idx}`,
        url: URL.createObjectURL(file),
        name: file.name,
      }));
      return [...prev, ...added];
    });
  };

  const handleRemoveDraftPhoto = (id: string) => {
    setDraftPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((p) => p.id !== id);
    });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!place) return;
    const trimmed = content.trim();
    if (!trimmed) return;

    const today = new Date().toISOString().slice(0, 10);
    const photoUrls = draftPhotos.map((p) => p.url);
    onAddReview(place.id, {
      id: `local-${Date.now()}`,
      authorNickname: "나(예시)",
      rating,
      content: trimmed,
      visitedAt: today,
      photos: photoUrls.length > 0 ? photoUrls : undefined,
      isSample: false,
    });

    // 등록된 리뷰가 object URL을 계속 표시할 수 있도록 revoke하지 않고 드래프트만 비움
    clearDraftPhotos(false);
    setContent("");
    setRating(5);
    setWriting(false);
  };

  return (
    <BottomSheet
      open={place !== null}
      onClose={handleClose}
      title={place ? `${place.name} 리뷰` : ""}
      actions={
        place && (
          <div className="flex gap-2">
            {!writing && (
              <ActionButton
                variant="fill"
                size="md"
                className="flex-1"
                onClick={() => setWriting(true)}
              >
                <Icon name="review" size={16} />
                <span>리뷰 남기기</span>
              </ActionButton>
            )}
            <a
              href={place.merUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={actionButtonClass({
                variant: writing ? "gray" : "tinted",
                size: "md",
                block: writing,
              })}
            >
              <span>잇플 가게 정보</span>
              <Icon name="external" size={15} />
            </a>
          </div>
        )
      }
    >
      {place && summary && (
        <div className="flex flex-col gap-4">
          {/* 식당 주소 + 평균 평점 요약 */}
          <div className="flex items-center justify-between gap-3 rounded-card bg-fill/75 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-xs text-muted">{place.address}</p>
              <div className="mt-1 flex items-center gap-1.5">
                <Icon name="star" size={16} className="text-star" />
                <span className="text-base font-bold text-foreground tabular-nums">
                  {summary.averageRating.toFixed(1)}
                </span>
                <span className="text-xs text-muted tabular-nums">
                  리뷰 {summary.reviewCount}개{summary.isSample ? "(예시)" : ""}
                </span>
              </div>
            </div>
            {place.genre && (
              <span className="shrink-0 text-xs font-medium text-muted">
                {place.genre}
              </span>
            )}
          </div>

          {/* 리뷰 작성 폼 */}
          {writing && (
            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-3 rounded-card bg-surface p-3.5 shadow-card"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">
                  별점 선택
                </span>
                <div
                  role="radiogroup"
                  aria-label="별점"
                  className="flex items-center gap-1"
                >
                  {[1, 2, 3, 4, 5].map((score) => (
                    <button
                      key={score}
                      type="button"
                      role="radio"
                      aria-checked={rating === score}
                      aria-label={`${score}점`}
                      onClick={() => setRating(score)}
                      className="cursor-pointer p-0.5 focus-ring"
                    >
                      <Icon
                        name="star"
                        size={20}
                        className={
                          score <= rating ? "text-star" : "text-muted/35"
                        }
                      />
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                rows={3}
                maxLength={500}
                placeholder="방문 후기를 남겨 주세요."
                aria-label="방문 후기 입력"
                className="field resize-none px-3 py-2.5 text-sm"
              />

              {/* 사진 첨부 영역 (최대 4장) */}
              <div className="flex flex-col gap-1.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFilesSelected}
                  aria-label="리뷰 사진 선택"
                  className="sr-only"
                />
                <div className="flex items-center gap-2 overflow-x-auto py-0.5">
                  {draftPhotos.length < MAX_REVIEW_PHOTOS && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="pressable flex size-16 shrink-0 flex-col items-center justify-center gap-1 rounded-[10px] border border-dashed border-line bg-fill/60 text-muted hover:text-foreground focus-ring"
                    >
                      <Icon name="camera" size={18} />
                      <span className="text-[11px] font-medium tabular-nums">
                        {draftPhotos.length}/{MAX_REVIEW_PHOTOS}
                      </span>
                    </button>
                  )}

                  {draftPhotos.map((photo) => (
                    <div
                      key={photo.id}
                      className="relative size-16 shrink-0 overflow-hidden rounded-[10px] bg-fill ring-1 ring-line"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.url}
                        alt={photo.name}
                        className="size-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveDraftPhoto(photo.id)}
                        aria-label={`${photo.name} 삭제`}
                        className="absolute top-1 right-1 inline-flex size-5 cursor-pointer items-center justify-center rounded-full bg-foreground/75 text-surface hover:bg-foreground focus-ring"
                      >
                        <Icon name="close" size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <ActionButton
                  variant="gray"
                  size="sm"
                  onClick={handleCancelWriting}
                >
                  취소
                </ActionButton>
                <ActionButton
                  type="submit"
                  variant="fill"
                  size="sm"
                  disabled={!content.trim()}
                >
                  등록하기
                </ActionButton>
              </div>
            </form>
          )}

          {/* 리뷰 목록 */}
          <ul aria-label="식당 리뷰 목록" className="list-divided">
            {summary.reviews.map((review) => (
              <li key={review.id} className="flex flex-col gap-1.5 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">
                      {review.authorNickname}
                    </span>
                    <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-foreground tabular-nums">
                      <Icon name="star" size={12} className="text-star" />
                      {review.rating.toFixed(1)}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted tabular-nums">
                    {review.visitedAt}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-foreground">
                  {review.content}
                </p>
                {review.photos && review.photos.length > 0 && (
                  <div className="mt-1 flex gap-2 overflow-x-auto pb-0.5">
                    {review.photos.map((photoUrl, idx) => (
                      <button
                        key={`${review.id}-photo-${idx}`}
                        type="button"
                        onClick={() => setLightboxUrl(photoUrl)}
                        aria-label={`리뷰 사진 ${idx + 1} 크게 보기`}
                        className="pressable relative size-20 shrink-0 overflow-hidden rounded-[10px] bg-fill ring-1 ring-line focus-ring"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photoUrl}
                          alt=""
                          className="size-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>

          {/* 리뷰 사진 크게 보기 오버레이 */}
          {lightboxUrl && (
            <div
              role="presentation"
              onClick={() => setLightboxUrl(null)}
              className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/75 p-4 backdrop-blur-xs"
            >
              <div
                onClick={(event) => event.stopPropagation()}
                className="relative max-h-[82dvh] max-w-[90vw] overflow-hidden rounded-card bg-surface shadow-float"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={lightboxUrl}
                  alt="확대된 리뷰 사진"
                  className="max-h-[82dvh] max-w-[90vw] object-contain"
                />
                <button
                  type="button"
                  onClick={() => setLightboxUrl(null)}
                  aria-label="사진 닫기"
                  className="absolute top-2.5 right-2.5 inline-flex size-8 cursor-pointer items-center justify-center rounded-full bg-foreground/75 text-surface hover:bg-foreground focus-ring"
                >
                  <Icon name="close" size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </BottomSheet>
  );
}
