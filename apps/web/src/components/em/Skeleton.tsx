/** 불러오는 동안 자리만 잡는 면. 움직이지 않는다(DESIGN §1: 펄스 금지). 감싸는 쪽에 aria-busy를 단다. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={`block rounded-input bg-fill ${className}`} />;
}

/** 식당·목록 한 줄이 들어올 자리 */
export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-3">
      <Skeleton className="size-12 shrink-0 rounded-button" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-2/5" />
        <Skeleton className="h-3.5 w-3/5" />
      </div>
    </div>
  );
}
