"use client";

import { useEffect, useRef, useState } from "react";
import { ActionButton, BottomSheet, TextField } from "@/components/em";
import { PhotoField } from "@/components/review/PhotoField";
import { ReviewFormFields } from "@/components/review/ReviewFormFields";
import {
  ApiError,
  deleteReview,
  toMyReview,
  updateReview,
} from "@/lib/my-page/api";
import { MAX_PHOTOS, PhotoUploadError, finalPhotoPaths, photoProblem, photosChanged, uploadPhotos } from "@/lib/my-page/photos";
import type { MyReview } from "@/types/my-page";

type ReviewEditSheetProps = {
  /** null이면 닫혀 있다. 리뷰가 바뀌면 key로 새로 만들어 입력값을 되돌린다. */
  review: MyReview | null;
  token: string;
  onClose: () => void;
  /** 저장·삭제가 진행 중인지 알린다. 부모가 같은 리뷰를 다시 열지 못하게 막는 데 쓴다. */
  onBusy: (id: string, busy: boolean) => void;
  onSaved: (review: MyReview) => void;
  onDeleted: (id: string) => void;
};

function errorText(error: unknown) {
  if (error instanceof ApiError && error.status === 401)
    return "로그인이 만료됐어요. 다시 로그인해 주세요.";
  if (error instanceof ApiError && error.status === 404)
    return "이미 지워진 리뷰예요. 목록을 새로고침해 주세요.";
  if (error instanceof ApiError && error.status === 400)
    return "입력한 값을 저장할 수 없어요. 별점과 방문일을 확인해 주세요.";
  if (error instanceof ApiError && error.status === 429)
    return "요청이 많아요. 잠시 후 다시 시도해 주세요.";
  return "저장하지 못했어요. 다시 시도해 주세요.";
}

/** 오늘 날짜(한국). 서버도 오늘 이후 방문일을 받지 않는다. */
function todayKst() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}

/** 내 리뷰를 고치거나 지운다. 저장은 버튼 하나, 지우기는 한 번 더 물어본다. */
export function ReviewEditSheet({
  review,
  token,
  onClose,
  onBusy,
  onSaved,
  onDeleted,
}: ReviewEditSheetProps) {
  const [rating, setRating] = useState<number>(review?.rating ?? 5);
  const [content, setContent] = useState(review?.content ?? "");
  const [isPublic, setIsPublic] = useState(review?.visibility === "public");
  const [visitedAt, setVisitedAt] = useState(review?.visited_at ?? "");
  // 사진: 원래 붙어 있던 것(kept, 지울 수 있음)과 이번에 새로 고른 것(added, 저장할 때 올림)
  const [kept, setKept] = useState(review?.photos ?? []);
  const [added, setAdded] = useState<{ id: string; file: File; url: string }[]>([]);
  const [photoError, setPhotoError] = useState("");
  const [photoNotice, setPhotoNotice] = useState("");
  const previews = useRef<string[]>([]);
  const uploadedRef = useRef(new Map<File, string>());
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  // 고른 사진의 미리보기 주소는 시트가 사라질 때 한꺼번에 풀어 준다
  useEffect(() => () => previews.current.forEach((url) => URL.revokeObjectURL(url)), []);

  function addPhotos(files: File[]) {
    let room = MAX_PHOTOS - kept.length - added.length;
    const next: typeof added = [];
    let problem = "";
    let full = false; // 4장이 이미 찬 경우는 잘못이 아니라 안내라서 오류색을 쓰지 않는다
    for (const file of files) {
      const issue = photoProblem(file);
      if (issue) { problem ||= issue; continue; }
      if (room <= 0) { full = true; continue; }
      const url = URL.createObjectURL(file);
      previews.current.push(url);
      next.push({ id: `n:${crypto.randomUUID()}`, file, url });
      room -= 1;
    }
    setPhotoError(problem);
    setPhotoNotice(!problem && full ? "사진은 4장까지 올릴 수 있어요" : "");
    if (next.length > 0) setAdded((current) => [...current, ...next]);
  }

  function removePhoto(id: string) {
    setPhotoError("");
    setPhotoNotice("");
    if (id.startsWith("k:")) setKept((current) => current.filter((photo) => `k:${photo.path}` !== id));
    else setAdded((current) => current.filter((photo) => photo.id !== id));
  }

  const photoItems = [
    ...kept.map((photo) => ({ id: `k:${photo.path}`, url: photo.url })),
    ...added.map((photo) => ({ id: photo.id, url: photo.url })),
  ];
  const photosDirty = review != null && photosChanged((review.photos ?? []).map((p) => p.path), kept.map((p) => p.path), added.length);

  const today = todayKst();
  // 날짜 칸에 직접 쓰면 max를 넘길 수 있다. 서버도 거절하므로 여기서 이유를 먼저 보여 준다.
  const visitedAtError = visitedAt > today ? "방문일은 오늘까지 고를 수 있어요" : undefined;
  const changed =
    review != null &&
    (rating !== review.rating ||
      content.trim() !== review.content ||
      (visitedAt !== "" && visitedAt !== review.visited_at) ||
      isPublic !== (review.visibility === "public") ||
      photosDirty);

  async function save() {
    if (!review || busy) return;
    // 버튼은 늘 누를 수 있다. 막히면 이유가 보이는 칸으로 옮기고, 바뀐 게 없으면 닫는다.
    if (visitedAtError) {
      document.getElementById("review-visited-at")?.focus();
      return;
    }
    if (!changed) {
      onClose();
      return;
    }
    setBusy(true);
    setError("");
    onBusy(review.id, true);
    let uploading = false;
    try {
      // 새 사진은 저장할 때 올리고, 서버에는 남길 사진과 새 사진의 최종 목록을 보낸다
      let photoPaths: string[] | undefined;
      if (photosDirty) {
        uploading = true;
        const uploaded = await uploadPhotos(token, added.map((photo) => photo.file), { uploaded: uploadedRef.current });
        uploading = false;
        photoPaths = finalPhotoPaths(kept.map((photo) => photo.path), uploaded);
      }
      const updated = await updateReview(token, review.id, {
        rating,
        content: content.trim(),
        ...(visitedAt && visitedAt !== review.visited_at ? { visitedAt } : {}),
        visibility: isPublic ? "public" : "private",
        ...(photoPaths ? { photoPaths } : {}),
      });
      onSaved(toMyReview(updated));
    } catch (e) {
      if (uploading) {
        setError(
          e instanceof PhotoUploadError && e.status === 401
            ? "로그인이 만료됐어요. 다시 로그인해 주세요."
            : "사진을 올리지 못했어요. 다시 눌러 주세요.",
        );
        setBusy(false);
        return;
      }
      setError(errorText(e));
      setBusy(false);
    } finally {
      onBusy(review.id, false);
    }
  }

  async function remove() {
    if (!review || busy) return;
    setBusy(true);
    setError("");
    onBusy(review.id, true);
    try {
      await deleteReview(token, review.id);
      onDeleted(review.id);
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    } finally {
      onBusy(review.id, false);
    }
  }

  return (
    <BottomSheet
      open={review !== null}
      onClose={onClose}
      title={review ? `${review.restaurant_name} 리뷰` : ""}
      actions={
        review &&
        (confirming ? (
          <div className="flex flex-col gap-2">
            <p className="type-body text-foreground">
              이 리뷰를 지울까요? 이 식당으로 받은 영토와 도감 기록이 함께
              줄어들 수 있어요.
            </p>
            <div className="flex gap-2">
              <ActionButton
                variant="gray"
                size="md"
                className="flex-1"
                disabled={busy}
                data-delete-cancel
                onClick={() => {
                  setConfirming(false);
                  // 확인 단계의 버튼이 사라지므로 "후기 지우기"로 포커스를 돌린다.
                  requestAnimationFrame(() => document.querySelector<HTMLElement>("[data-delete-start]")?.focus());
                }}
              >
                닫기
              </ActionButton>
              <ActionButton
                variant="danger"
                size="md"
                className="flex-1"
                disabled={busy}
                onClick={() => void remove()}
              >
                {busy ? "지우고 있어요" : "지우기"}
              </ActionButton>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <ActionButton
              variant="fill"
              size="md"
              block
              disabled={busy}
              onClick={() => void save()}
            >
              {busy ? "저장하고 있어요" : "저장하기"}
            </ActionButton>
            <ActionButton
              variant="plain"
              size="md"
              block
              className="text-danger"
              disabled={busy}
              data-delete-start
              onClick={() => {
                setConfirming(true);
                // 누른 버튼이 사라지므로 안전한 쪽(닫기)으로 포커스를 옮긴다.
                requestAnimationFrame(() => document.querySelector<HTMLElement>("[data-delete-cancel]")?.focus());
              }}
            >
              리뷰 지우기
            </ActionButton>
          </div>
        ))
      }
    >
      {review && (
        <fieldset
          disabled={busy}
          className="flex min-w-0 flex-col gap-4 border-0 p-0"
        >
          <ReviewFormFields
            rating={rating}
            onRating={setRating}
            content={content}
            onContent={setContent}
            isPublic={isPublic}
            onPublic={setIsPublic}
            placeholder="리뷰를 남겨 주세요."
            contentLabel="리뷰 내용"
          >
            {/* 내용 입력(별점·글·사진·방문일)을 먼저, 공개 설정을 마지막에 */}
            <PhotoField items={photoItems} onAdd={addPhotos} onRemove={removePhoto} error={photoError} notice={photoNotice} disabled={busy} />
            <TextField
              id="review-visited-at"
              label="방문일"
              type="date"
              value={visitedAt}
              max={today}
              error={visitedAtError}
              onChange={(event) => setVisitedAt(event.target.value)}
            />
          </ReviewFormFields>
          {error && (
            <p role="alert" className="type-caption text-danger">
              {error}
            </p>
          )}
        </fieldset>
      )}
    </BottomSheet>
  );
}
