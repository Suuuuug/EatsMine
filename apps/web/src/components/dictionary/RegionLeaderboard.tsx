import { Icon } from "@/components/icon/Icon";
import { buildLeaderboard, myStanding, standingMessage } from "@/lib/territory/leaderboard";
import { ME_ID, getDummyOwner } from "@/lib/territory/sample-data";

/** 선택한 지역의 리뷰 Top3. 자료가 없는 지역은 그리지 않는다. */
export function RegionLeaderboard({ regionCode }: { regionCode: string }) {
  const rows = buildLeaderboard(getDummyOwner(regionCode), ME_ID);
  if (rows.length === 0) return null;
  const message = standingMessage(myStanding(rows));

  return (
    <div className="border-b border-line py-3">
      <h5 className="flex items-center gap-2 type-body font-semibold">
        <Icon name="trophy" size={20} className="shrink-0 text-accent-dark" />
        {rows.length === 1 ? "영토 주인" : "이 지역 순위"}
      </h5>
      <ol className="m-0 mt-2 list-none p-0">
        {rows.map((r) => (
          <li key={r.ownerId} className={`flex min-h-11 items-center gap-3 rounded-button px-2 ${r.isMe ? "bg-accent-weak" : ""}`}>
            <span className="w-9 shrink-0 type-body font-semibold tabular-nums">{r.rank}위</span>
            <span className="min-w-0 flex-1 truncate type-body">
              {r.nickname}
              {r.rank === 1 && <span className="sr-only"> 영토 주인</span>}
              {r.isMe && <span className="sr-only"> (나)</span>}
            </span>
            <span className="shrink-0 type-caption text-muted tabular-nums"><span className="max-sm:sr-only">이 지역 </span>리뷰 {r.reviewCount}개</span>
          </li>
        ))}
      </ol>
      {message && <p className="mt-2 type-caption font-semibold text-accent-dark">{message}</p>}
    </div>
  );
}
