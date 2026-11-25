import { Icon } from "@/components/icon/Icon";
import type { ApiTerritoryOwner } from "@/lib/dictionary/dictionary-api";
import { buildLeaderboard, myStanding, standingMessage } from "@/lib/territory/leaderboard";
import { ME_ID, getDummyOwner } from "@/lib/territory/sample-data";

type Props = {
  regionCode: string;
  /** GET /territories 실데이터 연결 성공 여부 */
  territoryLive?: boolean;
  /** GET /territories 기준 집계 기간(일) */
  windowDays?: number;
  /** GET /territories 에서 조회한 해당 지역의 실제 영토 주인 */
  liveOwner?: ApiTerritoryOwner | null;
};

/**
 * 선택한 지역의 영토 주인(또는 백엔드 미연결 개발 모드에서는 예시 순위 Top3).
 * 백엔드 연결 시 최근 30일 실제 영토 주인을 표시하며, 주인이 없는 지역은 거짓 예시를 띄우지 않고 안내한다.
 */
export function RegionLeaderboard({
  regionCode,
  territoryLive = false,
  windowDays = 30,
  liveOwner = null,
}: Props) {
  if (territoryLive) {
    if (!liveOwner) {
      return (
        <div className="border-b border-line py-3">
          <h5 className="flex items-center gap-2 type-body font-semibold">
            <Icon name="trophy" size={20} className="shrink-0 text-accent-dark" />
            이 지역 영토 주인
          </h5>
          <p className="mt-1.5 type-caption text-muted">
            최근 {windowDays}일 영토 주인이 아직 없어요. 첫 리뷰를 남겨 보세요.
          </p>
        </div>
      );
    }

    return (
      <div className="border-b border-line py-3">
        <h5 className="flex items-center gap-2 type-body font-semibold">
          <Icon name="trophy" size={20} className="shrink-0 text-accent-dark" />
          이 지역 영토 주인
          <span className="ml-auto type-caption font-normal text-muted">
            최근 {windowDays}일
          </span>
        </h5>
        <ol className="m-0 mt-2 list-none p-0">
          <li className="flex min-h-11 items-center gap-3 rounded-button px-2">
            <span className="w-9 shrink-0 type-body font-semibold tabular-nums">1위</span>
            <span className="min-w-0 flex-1 truncate type-body">
              {liveOwner.ownerNickname}
              <span className="sr-only"> 영토 주인</span>
            </span>
            <span className="shrink-0 type-caption text-muted tabular-nums">
              <span className="max-sm:sr-only">이 지역 </span>리뷰 {liveOwner.reviewCount}개
            </span>
          </li>
        </ol>
      </div>
    );
  }

  // 백엔드 API 미연결(로컬 프리뷰 등)일 때만 기존 예시 순위 표시
  const rows = buildLeaderboard(getDummyOwner(regionCode), ME_ID);
  if (rows.length === 0) return null;
  const message = standingMessage(myStanding(rows));

  return (
    <div className="border-b border-line py-3">
      <h5 className="flex items-center gap-2 type-body font-semibold">
        <Icon name="trophy" size={20} className="shrink-0 text-accent-dark" />
        {rows.length === 1 ? "영토 주인 예시" : "이 지역 순위 예시"}
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
