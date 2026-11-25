import { Icon } from "@/components/icon/Icon";
import { restaurantRowFacts, type RestaurantRowData } from "./restaurant-row";

export type RestaurantRowProps = RestaurantRowData & {
  name: string;
  address: string;
  /** 잇플 응답의 merUrl 원본. 가공하지 않고 그대로 연다. 유효성 검사는 호출하는 쪽이 한다. */
  merUrl: string | null;
  /** 자세히 보기 클릭 시 아웃바운드 기록용 선택 콜백(링크 이동을 막지 않음). */
  onOutboundClick?: () => void;
};

export function RestaurantRow({
  name,
  address,
  rankNational,
  estimatedHours,
  merUrl,
  onOutboundClick,
}: RestaurantRowProps) {
  const facts = restaurantRowFacts({ rankNational, estimatedHours });
  return (
    <article className="flex flex-col justify-center border-b border-line py-1">
      <h3 className="truncate type-row font-semibold">{name}</h3>
      <p className="truncate type-caption text-muted">{address}</p>
      {facts.length > 0 && (
        <p className="truncate type-caption text-muted">{facts.join(" · ")}</p>
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
