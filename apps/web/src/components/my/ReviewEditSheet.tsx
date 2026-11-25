"use client";

import { useState } from "react";
import { ActionButton, BottomSheet } from "@/components/em";
import { ReviewFormFields } from "@/components/review/ReviewFormFields";
import {
  ApiError,
  deleteReview,
  toMyReview,
  updateReview,
} from "@/lib/my-page/api";
import type { MyReview } from "@/types/my-page";

type ReviewEditSheetProps = {
  /** null이면 닫혀 있다. 후기가 바뀌면 key로 새로 만들어 입력값을 되돌린다. */
  review: MyReview | null;
  token: string;
  onClose: () => void;
  /** 저장·삭제가 진행 중인지 알린다. 부모가 같은 후기를 다시 열지 못하게 막는 데 쓴다. */
  onBusy: (id: string, busy: boolean) => void;
  onSaved: (review: MyReview) => void;
  onDeleted: (id: string) => void;
};

function errorText(error: unknown) {
  if (error instanceof ApiError && error.status === 401)
    return "로그인이 만료됐어요. 다시 로그인해 주세요.";
  if (error instanceof ApiError && error.status === 404)
    return "이미 지워진 후기예요. 목록을 새로고침해 주세요.";
  if (error instanceof ApiError && error.status === 429)
    return "요청이 많아요. 잠시 후 다시 시도해 주세요.";
  return "저장하지 못했어요. 다시 시도해 주세요.";
}

/** 내 후기를 고치거나 지운다. 저장은 버튼 하나, 지우기는 한 번 더 물어본다. */
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
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  const changed =
    review != null &&
    (rating !== review.rating ||
      content.trim() !== review.content ||
      isPublic !== (review.visibility === "public"));

  async function save() {
    if (!review || busy) return;
    setBusy(true);
    setError("");
    onBusy(review.id, true);
    try {
      const updated = await updateReview(token, review.id, {
        rating,
        content: content.trim(),
        visibility: isPublic ? "public" : "private",
      });
      onSaved(toMyReview(updated));
    } catch (e) {
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
      title={review ? `${review.restaurant_name} 후기` : ""}
      actions={
        review &&
        (confirming ? (
          <div className="flex flex-col gap-2">
            <p className="type-body text-foreground">
              이 후기를 지울까요? 이 식당으로 받은 영토와 도감 기록이 함께
              줄어들 수 있어요.
            </p>
            <div className="flex gap-2">
              <ActionButton
                variant="gray"
                size="md"
                className="flex-1"
                disabled={busy}
                onClick={() => setConfirming(false)}
              >
                취소
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
              disabled={!changed || busy}
              onClick={() => void save()}
            >
              {busy ? "저장하고 있어요" : "저장하기"}
            </ActionButton>
            <ActionButton
              variant="plain"
              size="md"
              block
              disabled={busy}
              onClick={() => setConfirming(true)}
            >
              후기 지우기
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
            placeholder="후기를 남겨 주세요."
            contentLabel="후기 내용"
          />
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
