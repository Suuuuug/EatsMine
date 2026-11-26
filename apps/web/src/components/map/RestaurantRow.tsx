import { Icon } from "@/components/icon/Icon";
import type { PlaceReviewSummary } from "@/lib/map/use-restaurants";
import { restaurantRowFacts, type RestaurantRowData } from "./restaurant-row";

export type RestaurantRowProps = RestaurantRowData & {
  name: string;
  address: string;
  /** 잇플 응답의 merUrl 원본. 가공하지 않고 그대로 연다. 유효성 검사는 호출하는 쪽이 한다. */
  merUrl: string | null;
  /** GET /restaurants 응답에 포함된 우리 서비스 공개 리뷰 요약 */
  reviewSummary?: PlaceReviewSummary | null;
  /** 자세히 보기 클릭 시 아웃바운드 기록용 선택 콜백(링크 이동을 막지 않음). */
  onOutboundClick?: () => void;
};

export function RestaurantRow({
  name,
  address,
  rankNational,
  estimatedHours,
  merUrl,
  reviewSummary = null,
  onOutboundClick,
}: RestaurantRowProps) {
  const facts = restaurantRowFacts({ rankNational, estimatedHours });
  const hasSummary =
    reviewSummary !== null &&
    typeof reviewSummary.count === "number" &&
    reviewSummary.count > 0 &&
    typeof reviewSummary.average === "number" &&
    Number.isFinite(reviewSummary.average);

  return (
    <article className="flex flex-col justify-center border-b border-line py-1">
      <h3 className="truncate type-row font-semibold">{name}</h3>
      <p className="truncate type-caption text-muted">{address}</p>
      {facts.length > 0 && (
        <p className="truncate type-caption text-muted">{facts.join(" · ")}</p>
      )}
      {hasSummary && (
        <div className="mt-1 flex flex-col gap-0.5">
          <p className="flex items-center gap-1 type-caption font-semibold text-foreground tabular-nums">
            <Icon name="star" size={13} className="shrink-0 text-star" />
            <span>{reviewSummary.average.toFixed(1)}</span>
            <span className="font-normal text-muted">
              · 리뷰 {reviewSummary.count}개
            </span>
          </p>
          {reviewSummary.featured?.content && (
            <p className="truncate type-caption text-muted">
              “{reviewSummary.featured.content}”
            </p>
          )}
        </div>
      )}
      <div className="flex items-center justify-end gap-3">
        {merUrl && (
          <a
            className="pressable inline-flex min-h-11 shrink-0 items-center gap-1 rounded-input type-caption font-semibold text-accent-dark focus-ring"
            href={merUrl}
            target="_blank"
            rel="noopener"
            onClick={onOutboundClick}
          >
            <span>자세히 보기</span>
            <Icon name="external" size={13} />
          </a>
        )}
      </div>
    </article>
  );
}
