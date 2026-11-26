"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActionButton,
  BottomSheet,
  GlassSelect,
  Skeleton,
  RatingStars,
  actionButtonClass,
} from "@/components/em";
import { Icon } from "@/components/icon/Icon";
import { ReviewFormFields } from "@/components/review/ReviewFormFields";
import { getSamplePlaceReviews, type PlaceReviewItem } from "@/data/map-mock";
import { signInWithGoogle } from "@/lib/auth/google";
import { useSession } from "@/lib/auth/session";
import { validEatplUrl } from "@/lib/map/home-contract";
import { trackOutbound } from "@/lib/map/outbound";
import { stripPhotoMetadata } from "@/lib/my-page/review-photo-process";
import {
  ApiError,
  createReview,
  createReviewErrorMessage,
  MAX_REVIEW_PHOTO_BYTES,
  reviewPhotoProblem,
  uploadReviewPhoto,
  fetchFoodCandidates,
  fetchRestaurantReviews,
  type FoodCandidate,
  type RestaurantReviewsDto,
} from "@/lib/my-page/api";
import type { EatplPlace } from "@/types/map";

const MAX_REVIEW_PHOTOS = 4;

/** 잇플 상세 주소 끝의 매장 고유값. API의 매장 ID와 같다. */
function merchantId(merUrl: string | null): string | null {
  if (!merUrl) return null;
  try {
    return (
      new URL(merUrl).pathname.match(
        /^\/mer\/web\/profile\/([A-Za-z0-9_-]{1,100})\/?$/,
      )?.[1] ?? null
    );
  } catch {
    return null;
  }
}

type DraftPhoto = {
  id: string;
  url: string;
  name: string;
  /** 저장할 때 올릴 원본 파일 */
  file: File;
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
  // 리뷰를 공개할지는 쓸 때마다 정한다. 처음에는 공개(공개 리뷰만 영토·순위·매장 리뷰에 반영된다).
  const [isPublic, setIsPublic] = useState(true);
  // 먹은 음식(선택). 고르면 도감에 모인다. 후보는 매장 업종에 연결된 도감 음식이다.
  const [foodId, setFoodId] = useState<number | null>(null);
  const [foodCandidates, setFoodCandidates] = useState<{
    genre: string;
    items: FoodCandidate[];
  } | null>(null);
  const session = useSession();
  const token =
    session.status === "ready" ? (session.session?.accessToken ?? null) : null;
  const userId =
    session.status === "ready" ? (session.session?.user.id ?? null) : null;
  // 서버에서 읽은 공개 리뷰(매장별). 이 매장 값이 없으면 불러오는 중이다.
  const [remote, setRemote] = useState<
    | { id: string; status: "ok"; data: RestaurantReviewsDto }
    | { id: string; status: "error" }
    | null
  >(null);
  const [submitting, setSubmitting] = useState(false);
  // 저장 중 사진 올리기 진행(예: 1/3). null이면 사진 단계가 아니다.
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState("");
  // 저장 요청이 끝났을 때 폼이 그대로인지 확인한다(취소·닫기·새로 쓰기가 있었으면 이 값이 바뀐다).
  const draftIdRef = useRef(0);
  const [draftPhotos, setDraftPhotos] = useState<DraftPhoto[]>([]);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const draftPhotosRef = useRef<DraftPhoto[]>([]);
  // 같은 초안에서 이미 올린 사진의 경로(사진 id → path). 저장이 실패해 다시 눌러도 다시 올리지 않는다.
  const uploadedPathsRef = useRef(new Map<string, string>());

  useEffect(() => {
    draftPhotosRef.current = draftPhotos;
  }, [draftPhotos]);

  // 시트 언마운트 시 아직 제출하지 않은 드래프트 사진의 object URL을 정리한다.
  useEffect(() => {
    return () => {
      for (const photo of draftPhotosRef.current) {
        URL.revokeObjectURL(photo.url);
      }
    };
  }, []);

  // 잇플 링크는 home-contract의 validEatplUrl로 검증한 API 응답 원본 URL만 허용한다(쿼리 추가·변형 금지).
  const safeEatplUrl = place ? validEatplUrl(place.merUrl) : null;
  const placeMerchantId = merchantId(safeEatplUrl);
  const canSave = Boolean(token && safeEatplUrl && placeMerchantId);

  // 이미 읽은 목록을 다시 읽을 때(리뷰 저장 뒤)는 이전 목록을 그대로 두고 바꿔 끼운다.
  const loadRemote = useCallback((id: string) => {
    fetchRestaurantReviews(id).then(
      (data) => setRemote({ id, status: "ok", data }),
      () =>
        setRemote((prev) =>
          prev?.id === id && prev.status === "ok" ? prev : { id, status: "error" },
        ),
    );
  }, []);
  const retryRemote = () => {
    if (!placeMerchantId) return;
    setRemote(null);
    loadRemote(placeMerchantId);
  };
  useEffect(() => {
    if (!placeMerchantId) return;
    loadRemote(placeMerchantId);
  }, [placeMerchantId, loadRemote]);

  // 쓰기를 열면 매장 업종의 음식 후보를 한 번 읽는다(실패하면 음식 선택 없이 저장).
  const placeGenre = place?.genre ?? null;
  useEffect(() => {
    if (!writing || !placeGenre || foodCandidates?.genre === placeGenre) return;
    let cancelled = false;
    fetchFoodCandidates(placeGenre).then(
      (items) => {
        if (!cancelled) setFoodCandidates({ genre: placeGenre, items });
      },
      () => {
        if (!cancelled) setFoodCandidates({ genre: placeGenre, items: [] });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [writing, placeGenre, foodCandidates?.genre]);
  const foods =
    foodCandidates && foodCandidates.genre === placeGenre
      ? foodCandidates.items
      : [];

  // 예시 리뷰는 API 없이 보는 예시 매장(잇플 링크가 없는 매장)에서만 쓴다.
  const usesSample = !placeMerchantId || !process.env.NEXT_PUBLIC_API_URL;
  const remoteForPlace =
    remote && remote.id === placeMerchantId ? remote : null;
  const reviewState: "ready" | "loading" | "error" = usesSample
    ? "ready"
    : !remoteForPlace
      ? "loading"
      : remoteForPlace.status === "ok"
        ? "ready"
        : "error";
  const serverData =
    remoteForPlace?.status === "ok" ? remoteForPlace.data : null;
  // 저장한 리뷰는 쓴 계정에게만 보인다. 로그아웃하거나 계정이 바뀌면 서버 조회 결과와 상관없이 숨긴다.
  const ownReviews = userReviews.filter(
    (r) => !r.saved || r.ownerId === userId,
  );
  const sample =
    place && usesSample ? getSamplePlaceReviews(place, ownReviews) : null;
  // 실제 매장은 서버 리뷰, 예시 매장은 예시 리뷰. 내가 방금 쓴 나만 보기 리뷰는 목록 맨 위에 둔다.
  const summary = serverData
    ? {
        averageRating: serverData.summary?.average ?? null,
        reviewCount: serverData.summary?.count ?? 0,
        isSample: false,
        reviews: [
          ...ownReviews.filter((r) => r.saved && r.visibility === "private"),
          ...serverData.items.map<PlaceReviewItem>((item) => ({
            id: `server-${item.id}`,
            authorNickname: item.author.nickname,
            rating: item.rating,
            content: item.content ?? "",
            visitedAt: item.visitedAt ?? item.createdAt.slice(0, 10),
            photos: item.photos?.length
              ? item.photos.map((photo) => photo.url)
              : undefined,
          })),
        ],
      }
    : sample;

  const clearDraftPhotos = (revokeUrls: boolean) => {
    if (revokeUrls) {
      for (const photo of draftPhotos) {
        URL.revokeObjectURL(photo.url);
      }
    }
    uploadedPathsRef.current.clear();
    setDraftPhotos([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    draftIdRef.current += 1;
    setSubmitting(false);
    setUploadProgress(null);
    clearDraftPhotos(true);
    setLightboxUrl(null);
    setWriting(false);
    setContent("");
    setRating(5);
    setIsPublic(true);
    setFoodId(null);
    onClose();
  };

  const handleFilesSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files ?? []);
    event.target.value = "";
    // 올릴 수 없는 형식·크기는 고를 때 바로 알려 주고 뺀다(서버·저장소도 같은 기준).
    const problem = picked.map(reviewPhotoProblem).find(Boolean);
    setSubmitError(problem ?? "");
    const files = picked.filter((file) => !reviewPhotoProblem(file));
    if (files.length === 0) return;

    setDraftPhotos((prev) => {
      const remaining = MAX_REVIEW_PHOTOS - prev.length;
      if (remaining <= 0) return prev;
      const added: DraftPhoto[] = files
        .slice(0, remaining)
        .map((file, idx) => ({
          id: `photo-${Date.now()}-${idx}`,
          url: URL.createObjectURL(file),
          name: file.name,
          file,
        }));
      return [...prev, ...added];
    });
  };

  const handleRemoveDraftPhoto = (id: string) => {
    uploadedPathsRef.current.delete(id);
    setDraftPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((p) => p.id !== id);
    });
  };

  const resetDraft = (revokeUrls = true) => {
    draftIdRef.current += 1;
    setUploadProgress(null);
    clearDraftPhotos(revokeUrls);
    setContent("");
    setRating(5);
    setIsPublic(true);
    setFoodId(null);
    setSubmitError("");
    setWriting(false);
  };

  // 구글 로그인 뒤 지금 지도 화면(지역 포함)으로 돌아온다. 쓰던 글은 이동하면서 사라지므로 다시 써야 한다.
  const handleLogin = async () => {
    const result = await signInWithGoogle(
      `${window.location.pathname}${window.location.search}`,
    );
    if (!result.ok) {
      setSubmitError(
        result.reason === "not-configured"
          ? "지금은 로그인을 쓸 수 없어요."
          : "로그인을 시작하지 못했어요. 다시 시도해 주세요.",
      );
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!place || submitting) return;
    const trimmed = content.trim();
    if (!trimmed) return;

    const visibility = isPublic ? "public" : "private";
    const local = (saved: boolean): PlaceReviewItem => ({
      id: `local-${Date.now()}`,
      authorNickname: saved ? "나" : "나(예시)",
      rating,
      content: trimmed,
      visitedAt: new Date().toISOString().slice(0, 10),
      photos:
        draftPhotos.length > 0 ? draftPhotos.map((p) => p.url) : undefined,
      isSample: false,
      saved,
      ownerId: saved ? (userId ?? undefined) : undefined,
      visibility,
    });

    // 로그인했고 잇플 매장이면 우리 API에 저장한다. 아니면 이 화면에서만 보이는 예시로 남긴다.
    if (token && safeEatplUrl && placeMerchantId) {
      const draftId = draftIdRef.current;
      setSubmitting(true);
      setSubmitError("");
      // 1) 사진을 한 장씩 올려 경로를 모은다(파일은 저장소로 바로 올라가고 api를 거치지 않는다).
      const photoPaths: string[] = [];
      try {
        for (const [i, photo] of draftPhotos.entries()) {
          if (draftId !== draftIdRef.current) return;
          setUploadProgress(`${i + 1}/${draftPhotos.length}`);
          const uploaded = uploadedPathsRef.current.get(photo.id);
          if (uploaded) {
            photoPaths.push(uploaded);
            continue;
          }
          // 위치 정보 등 메타데이터를 지우고 줄여서 다시 저장한 파일만 올린다.
          const cleaned = await stripPhotoMetadata(photo.file);
          if (cleaned.size > MAX_REVIEW_PHOTO_BYTES) throw new ApiError(413);
          const path = await uploadReviewPhoto(token, cleaned);
          uploadedPathsRef.current.set(photo.id, path);
          photoPaths.push(path);
        }
      } catch (e) {
        if (draftId === draftIdRef.current) {
          const status = e instanceof ApiError ? e.status : 0;
          setSubmitError(
            status === 401
              ? createReviewErrorMessage(401)
              : status === 413
                ? "사진이 너무 커요. 다른 사진을 골라 주세요."
                : "사진을 올리지 못했어요. 다시 시도해 주세요.",
          );
          setSubmitting(false);
          setUploadProgress(null);
        }
        return;
      }
      setUploadProgress(null);
      // 마지막 사진을 올린 직후 시트를 닫았거나 취소했으면 저장하지 않는다(업로드 단계의 취소).
      if (draftId !== draftIdRef.current) return;
      // 2) 올린 사진 경로를 붙여 리뷰를 저장한다.
      try {
        await createReview(token, {
          merUrl: safeEatplUrl,
          restaurantName: place.name,
          rating,
          content: trimmed,
          visibility,
          ...(foodId != null && foods.some((f) => f.id === foodId)
            ? { foodId }
            : {}),
          ...(photoPaths.length ? { photoPaths } : {}),
        });
      } catch (e) {
        if (draftId === draftIdRef.current) {
          setSubmitError(
            createReviewErrorMessage(e instanceof ApiError ? e.status : 0),
          );
          setSubmitting(false);
        }
        return;
      }
      if (draftId !== draftIdRef.current) {
        // 저장 중에 폼을 닫았거나 취소했다. 새 입력은 건드리지 않고 공개 리뷰 목록만 갱신한다.
        if (visibility === "public") loadRemote(placeMerchantId);
        return;
      }
      setSubmitting(false);
      // 공개 리뷰는 서버 목록(사진 포함)에서 다시 읽고, 나만 보기 리뷰는 이 화면에 보여 준다.
      if (visibility === "public") {
        loadRemote(placeMerchantId);
        resetDraft();
      } else {
        onAddReview(place.id, local(true));
        // 이 화면의 나만 보기 리뷰가 사진 미리보기를 계속 쓰므로 URL은 지우지 않는다.
        resetDraft(false);
      }
      return;
    }
    onAddReview(place.id, local(false));
    // 등록된 리뷰가 object URL을 계속 표시할 수 있도록 revoke하지 않고 드래프트만 비움
    resetDraft(false);
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
            {safeEatplUrl ? (
              <a
                href={safeEatplUrl}
                target="_blank"
                rel="noopener"
                onClick={() => trackOutbound(safeEatplUrl, "list")}
                className={actionButtonClass({
                  variant: writing ? "gray" : "tinted",
                  size: "md",
                  block: writing,
                })}
              >
                <span>자세히 보기</span>
                <Icon name="external" size={15} />
              </a>
            ) : (
              <button
                type="button"
                disabled
                title="백엔드 API 연동 후 가게 상세 페이지로 연결돼요"
                className={actionButtonClass({
                  variant: "gray",
                  size: "md",
                  block: writing,
                  className: "cursor-not-allowed opacity-60",
                })}
              >
                <span>자세히 보기(예시)</span>
              </button>
            )}
          </div>
        )
      }
    >
      {place && (
        <div className="flex flex-col gap-4">
          {/* 식당 주소 + 평균 평점 요약 */}
          <div className="flex flex-col gap-2">
            <p className="flex items-center gap-1.5 type-caption text-muted">
              <Icon name="pin" size={16} className="shrink-0" />
              <span className="min-w-0 flex-1 truncate">{place.address}</span>
              {place.genre && <span className="shrink-0">{place.genre}</span>}
            </p>
            {reviewState === "loading" ? (
              <p role="status" className="type-caption text-muted">
                리뷰를 불러오고 있어요…
              </p>
            ) : reviewState === "error" || !summary ? (
              <div className="flex items-center justify-between gap-3">
                <p className="type-caption text-muted">
                  리뷰를 불러오지 못했어요.
                </p>
                <ActionButton variant="gray" size="sm" onClick={retryRemote}>
                  다시 시도
                </ActionButton>
              </div>
            ) : summary.averageRating != null ? (
              <div className="flex items-center gap-2">
                <span className="type-row tabular-nums">
                  {summary.averageRating.toFixed(1)}
                </span>
                <RatingStars value={summary.averageRating} size={20} />
                <span className="type-caption text-muted tabular-nums">
                  리뷰 {summary.reviewCount}개{summary.isSample ? "(예시)" : ""}
                </span>
              </div>
            ) : (
              <p className="type-caption text-muted">
                아직 공개된 리뷰가 없어요
              </p>
            )}
          </div>

          {/* 리뷰 작성 폼 */}
          {writing && (
            <form onSubmit={handleSubmit} className="glass rounded-card p-4">
              {/* 저장하는 동안에는 입력·공개 범위·취소를 막아 보낸 값과 화면 값이 달라지지 않게 한다 */}
              <fieldset
                disabled={submitting}
                className="flex min-w-0 flex-col gap-4 border-0 p-0"
              >
                <ReviewFormFields
                  rating={rating}
                  onRating={setRating}
                  content={content}
                  onContent={setContent}
                  isPublic={isPublic}
                  onPublic={setIsPublic}
                  placeholder="여행 중 다녀온 리뷰를 남겨 주세요."
                  contentLabel="여행 리뷰 입력"
                >
                  {/* 사진 첨부 영역 (최대 4장). 화면은 만들어 두었고 사진 저장소가 없어 서버에는 보내지 않는다 */}
                  {
                    <div className="flex flex-col gap-1.5">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
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
                            className="pressable flex size-16 shrink-0 flex-col items-center justify-center gap-1 rounded-input border border-dashed border-line bg-fill/60 text-muted hover:text-foreground focus-ring"
                          >
                            <Icon name="camera" size={18} />
                            <span className="type-caption tabular-nums">
                              {draftPhotos.length}/{MAX_REVIEW_PHOTOS}
                            </span>
                          </button>
                        )}

                        {draftPhotos.map((photo) => (
                          <div
                            key={photo.id}
                            className="relative size-16 shrink-0 overflow-hidden rounded-input bg-fill ring-1 ring-line"
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
                      {/* 형식·용량은 고를 때 걸러질 때만 알린다. 대표 사진 고지는 공개이고 사진이 있을 때만 */}
                      {isPublic && draftPhotos.length > 0 && (
                        <p className="type-caption text-foreground">
                          공개 리뷰의 사진은 가게 대표 사진으로 보일 수 있어요.
                        </p>
                      )}
                    </div>
                  }
                  {canSave && foods.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <span className="type-caption text-foreground">
                        먹은 음식 <span className="text-muted">(선택)</span>
                      </span>
                      {/* 도감 수집 필터와 같은 유리 패널 드롭다운 */}
                      <GlassSelect
                        trigger="field"
                        options={[
                          { value: "", label: "고르지 않기" },
                          ...foods.map((food) => ({
                            value: String(food.id),
                            label: food.name,
                          })),
                        ]}
                        value={foodId == null ? "" : String(foodId)}
                        onChange={(next) => setFoodId(next ? Number(next) : null)}
                        placeholderValue=""
                        label="먹은 음식"
                        listLabel="먹은 음식 목록"
                      />
                      <span className="type-caption text-muted">
                        고른 음식은 도감에 모여요.
                      </span>
                    </div>
                  )}
                </ReviewFormFields>

                {!token && (
                  <div className="flex items-center justify-between gap-3 rounded-input bg-fill/60 px-3 py-2.5">
                    <p className="min-w-0 type-caption text-muted">
                      로그인하면 리뷰가 저장돼요. 지금은 이 화면에서만 보여요.
                    </p>
                    <ActionButton
                      variant="tinted"
                      size="sm"
                      className="shrink-0"
                      onClick={handleLogin}
                    >
                      로그인하고 저장하기
                    </ActionButton>
                  </div>
                )}
                {submitError && (
                  <p role="alert" className="type-caption text-danger">
                    {submitError}
                  </p>
                )}

                <div className="flex justify-end gap-2">
                  <ActionButton
                    variant="gray"
                    size="sm"
                    onClick={() => resetDraft()}
                  >
                    취소
                  </ActionButton>
                  <ActionButton
                    type="submit"
                    variant="fill"
                    size="sm"
                    disabled={!content.trim() || submitting}
                  >
                    {uploadProgress
                      ? `사진 올리는 중 ${uploadProgress}`
                      : submitting
                        ? "저장하고 있어요"
                        : "등록하기"}
                  </ActionButton>
                </div>
              </fieldset>
            </form>
          )}

          {/* 리뷰 목록 (불러오는 중·실패는 위 요약 줄에서 안내) */}
          {reviewState === "loading" ? (
            // 리뷰가 없을 때의 "첫 리뷰를 남겨 보세요." 문단과 같은 크기라, 불러온 뒤 시트 높이가 바뀌지 않는다.
            <p aria-hidden="true" className="relative py-2 type-body">
              <span className="invisible">첫 리뷰를 남겨 보세요.</span>
              <Skeleton className="absolute inset-y-2.5 left-0 w-44" />
            </p>
          ) : !summary ? null : summary.reviews.length === 0 ? (
            <p className="py-2 type-body text-muted">첫 리뷰를 남겨 보세요.</p>
          ) : (
            <ul aria-label="식당 리뷰 목록" className="list-divided">
              {summary.reviews.map((review) => (
                <li key={review.id} className="flex flex-col gap-2 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate type-caption font-semibold text-foreground">
                      {review.authorNickname}
                    </span>
                    <span className="flex shrink-0 items-center gap-2 type-caption text-muted">
                      {review.visibility === "private" && (
                        <span className="inline-flex items-center gap-1">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src="/images/rating/lock-private.svg"
                            alt=""
                            width={16}
                            height={16}
                          />
                          나만 보기
                        </span>
                      )}
                      <span className="tabular-nums">{review.visitedAt}</span>
                    </span>
                  </div>
                  <RatingStars value={review.rating} size={16} />
                  <p className="type-body text-foreground">{review.content}</p>
                  {review.photos && review.photos.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-0.5">
                      {review.photos.map((photoUrl, idx) => (
                        <button
                          key={`${review.id}-photo-${idx}`}
                          type="button"
                          onClick={() => setLightboxUrl(photoUrl)}
                          aria-label={`리뷰 사진 ${idx + 1} 크게 보기`}
                          className="pressable relative size-20 shrink-0 overflow-hidden rounded-input bg-fill ring-1 ring-line focus-ring"
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
          )}

          {/* 리뷰 사진 크게 보기 오버레이 */}
          {lightboxUrl && (
            <div
              role="presentation"
              onClick={() => setLightboxUrl(null)}
              className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/75 p-4"
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
