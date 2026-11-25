import { restaurantRowFacts, type RestaurantRowData } from "./restaurant-row";

export type RestaurantRowProps = RestaurantRowData & {
  name: string;
  address: string;
  /** 잇플 응답의 merUrl 원본. 가공하지 않고 그대로 연다. 유효성 검사는 호출하는 쪽이 한다. */
  merUrl: string | null;
};

export function RestaurantRow({ name, address, rankNational, estimatedHours, merUrl }: RestaurantRowProps) {
  const facts = restaurantRowFacts({ rankNational, estimatedHours });
  return (
    <article className="flex flex-col justify-center border-b border-line py-1">
      <h3 className="truncate type-row font-semibold">{name}</h3>
      <p className="truncate type-caption text-muted">{address}</p>
      {facts.length > 0 && <p className="truncate type-caption text-muted">{facts.join(" · ")}</p>}
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 flex-1 truncate type-caption text-muted">후기 정보를 준비하고 있어요</p>
        {merUrl && <a className="pressable inline-flex min-h-11 shrink-0 items-center rounded-input type-caption font-semibold text-accent-dark focus-ring" href={merUrl} target="_blank" rel="noopener">잇플에서 상세 보기</a>}
      </div>
    </article>
  );
}
