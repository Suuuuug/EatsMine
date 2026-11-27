"use client";

import { useState } from "react";
import Link from "next/link";
import { ActionButton, EmptyState, RatingStars, actionButtonClass } from "@/components/em";
import { Icon } from "@/components/icon/Icon";
import { MySection } from "@/components/my/MySection";
import { ReviewEditSheet } from "@/components/my/ReviewEditSheet";
import { GlassCard } from "@/components/ui";
import { formatMonthDay } from "@/lib/my-page/format";
import { trackOutbound } from "@/lib/map/outbound";
import type { MyReview } from "@/types/my-page";

/** 처음에는 최근 리뷰만 둔다. 같은 줄 카드와 높이가 크게 벌어지지 않게 한다. */
const SHOWN = 2;

type ReviewListProps = {
  reviews: MyReview[];
  /** 로그인한 사람의 토큰. 있으면 리뷰를 고치고 지울 수 있다. 예시 화면은 null. */
  token?: string | null;
  /** 리뷰를 지운 뒤 영토·도감 같은 다른 기록도 다시 읽을 때 부른다. */
  onDeleted?: () => void;
  className?: string;
};

/** 서명 주소가 만료돼 사진이 깨지면 빈 칸(회색 상자)으로 보여 준다. */
function ReviewThumb({ url, alt }: { url: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <li className="size-14 shrink-0">
      {failed ? (
        <div role="img" aria-label={`${alt}을 불러오지 못했어요`} className="size-full rounded-input bg-foreground/5 shadow-[inset_0_0_0_1px_var(--color-line)]" />
      ) : (
        // 잠깐 유효한 서명 주소라 next/image 최적화를 쓰지 않는다
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={alt} loading="lazy" onError={() => setFailed(true)} className="size-full rounded-input object-cover shadow-[inset_0_0_0_1px_var(--color-line)]" />
      )}
    </li>
  );
}

export function ReviewList({
  reviews: initial,
  token = null,
  onDeleted,
  className,
}: ReviewListProps) {
  const [reviews, setReviews] = useState(initial);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  // 저장·삭제가 끝나기 전에는 같은 리뷰를 다시 열 수 없다(시트를 닫아도 요청은 계속된다).
  const [busyIds, setBusyIds] = useState<ReadonlySet<string>>(new Set());
  const editing = reviews.find((review) => review.id === editingId) ?? null;
  const shown = expanded ? reviews : reviews.slice(0, SHOWN);

  return (
    <MySection
      id="my-reviews-title"
      title="내가 남긴 리뷰"
      className={className}
    >
      <GlassCard className="flex-1 px-4">
        {reviews.length === 0 ? (
          <EmptyState
            illustration="empty-reviews"
            message="아직 남긴 리뷰가 없어요"
            action={
              <Link href="/" className={actionButtonClass({ variant: "tinted" })}>
                리뷰 남길 식당 찾기
              </Link>
            }
          />
        ) : (
          <>
            <ul className="list-divided">
              {shown.map((review) => (
                <li key={review.id} className="flex flex-col gap-1 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="min-w-0 truncate type-row text-foreground">
                      {review.mer_url ? (
                        <a
                          href={review.mer_url}
                          target="_blank"
                          rel="noopener"
                          onClick={() => review.mer_url && trackOutbound(review.mer_url, "list")}
                          className="pressable inline-flex min-h-11 items-center"
                        >
                          {review.restaurant_name}
                        </a>
                      ) : (
                        review.restaurant_name
                      )}
                    </h3>
                    {token && (
                      // 버튼 안쪽 여백만큼 당겨 글자 오른쪽 끝을 카드 안쪽 여백선에 맞춘다
                      <ActionButton
                        variant="plain"
                        size="sm"
                        className="-mr-3.5 shrink-0"
                        disabled={busyIds.has(review.id)}
                        aria-label={`${review.restaurant_name} 리뷰 수정`}
                        data-edit-review={review.id}
                        onClick={() => setEditingId(review.id)}
                      >
                        수정
                      </ActionButton>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <RatingStars value={review.rating} size={16} />
                    <span className="type-caption text-muted tabular-nums">
                      {formatMonthDay(review.visited_at)}에 다녀왔어요
                    </span>
                    {/* 기본값(공개)은 적지 않고, 나만 보기일 때만 자물쇠와 글자로 알린다 */}
                    {review.visibility === "private" && (
                      <span className="inline-flex items-center gap-1 type-caption text-muted">
                        <Icon name="lock" size={14} />
                        나만 보기
                      </span>
                    )}
                  </div>
                  {review.photos && review.photos.length > 0 && (
                    <ul aria-label={`${review.restaurant_name} 리뷰 사진`} className="mt-1 flex gap-2">
                      {review.photos.map((photo, index) => (
                        <ReviewThumb key={photo.path} url={photo.url} alt={`리뷰 사진 ${index + 1}`} />
                      ))}
                    </ul>
                  )}
                  {review.content && (
                    <p
                      className={`mt-1 type-body text-foreground/90 ${expanded ? "" : "line-clamp-2"}`}
                    >
                      {review.content}
                    </p>
                  )}
                </li>
              ))}
            </ul>
            {reviews.length > SHOWN && (
              <div className="border-t border-line py-2">
                <ActionButton
                  variant="plain"
                  size="md"
                  block
                  onClick={() => setExpanded((value) => !value)}
                >
                  {expanded ? "접기" : `리뷰 ${reviews.length}개 모두 보기`}
                </ActionButton>
              </div>
            )}
          </>
        )}
      </GlassCard>
      {token && (
        <ReviewEditSheet
          key={editing?.id ?? "none"}
          review={editing}
          token={token}
          onClose={() => setEditingId(null)}
          onBusy={(id, busy) =>
            setBusyIds((current) => {
              const next = new Set(current);
              if (busy) next.add(id);
              else next.delete(id);
              return next;
            })
          }
          // 요청이 끝났을 때 사용자가 다른 리뷰를 열어 두었다면 그 시트는 닫지 않는다
          onSaved={(updated) => {
            setReviews((list) =>
              list.map((review) =>
                review.id === updated.id ? updated : review,
              ),
            );
            setEditingId((current) =>
              current === updated.id ? null : current,
            );
            // 저장 중 버튼이 잠겨 포커스가 사라진다. 고친 리뷰의 수정 버튼으로 돌려놓는다.
            requestAnimationFrame(() =>
              document.querySelector<HTMLElement>(`[data-edit-review="${updated.id}"]`)?.focus(),
            );
          }}
          onDeleted={(id) => {
            setReviews((list) => list.filter((review) => review.id !== id));
            setEditingId((current) => (current === id ? null : current));
            // 지운 리뷰의 버튼은 사라지므로 목록 제목으로 포커스를 옮긴다.
            requestAnimationFrame(() => document.getElementById("my-reviews-title")?.focus());
            onDeleted?.();
          }}
        />
      )}
    </MySection>
  );
}
