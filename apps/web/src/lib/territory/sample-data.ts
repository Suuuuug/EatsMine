// 개발 확인용 더미, 실제 API 연결 시 교체.
// 화면 구조 확인용 값이며 실제 사용자·집계와 무관하다. 닉네임은 실존 인물·실명·이메일과 무관한 가상 값이다.
import regionCodes from "../../../public/images/maps/region-codes.json" with { type: "json" };
import type { TerritoryContender, TerritoryOwner } from "@/types/territory";

export const ME_ID = "dummy-me";
export const ME_NICKNAME = "나";

// 12명(8명 초과)이라 색 재사용 경우도 확인할 수 있다. 마지막이 나다.
const USERS: readonly { id: string; nickname: string }[] = [
  { id: "dummy-1", nickname: "국밥순례자" },
  { id: "dummy-2", nickname: "면치기장인" },
  { id: "dummy-3", nickname: "새벽시장러" },
  { id: "dummy-4", nickname: "냠냠토끼" },
  { id: "dummy-5", nickname: "바삭한오후" },
  { id: "dummy-6", nickname: "찜닭탐정" },
  { id: "dummy-7", nickname: "골목식당러버" },
  { id: "dummy-8", nickname: "수제비한그릇" },
  { id: "dummy-9", nickname: "달달한하루" },
  { id: "dummy-10", nickname: "참기름한방울" },
  { id: "dummy-11", nickname: "밥심으로산다" },
  { id: ME_ID, nickname: ME_NICKNAME },
];

function contender(userIndex: number, reviewCount: number): TerritoryContender {
  const u = USERS[userIndex % USERS.length];
  return { ownerId: u.id, nickname: u.nickname, reviewCount };
}

// 지역 순서 n으로 결정되는 값. n % 6 === 5면 1위 없음(목록에서 빠짐), n % 7 === 3이면 내가 1위.
function build(code: string, n: number): TerritoryOwner | null {
  if (n % 6 === 5) return null;
  const isMe = n % 7 === 3;
  const first = 9 + ((n * 5) % 17); // 9~25
  const second = first - 1 - (n % 3); // 1위보다 작음
  const third = second - 1 - (n % 2); // 2위보다 작음
  const start = n * 5;
  const meIndex = USERS.length - 1;
  const people = isMe
    ? [meIndex, start % meIndex, (start + 1 + (n % 3)) % meIndex]
    : [start % meIndex, (start + 3) % meIndex, (start + 7) % meIndex];
  // 같은 사람이 겹치지 않게 한다.
  const uniq = people.filter((p, i) => people.indexOf(p) === i);
  while (uniq.length < 3) uniq.push((uniq[uniq.length - 1] + 1) % meIndex);
  const [a, b, c] = uniq;
  const top1 = contender(a, first);
  return {
    regionCode: code,
    ...top1,
    isMe,
    top: [contender(b, second), contender(c, third)],
  };
}

const codes: string[] = regionCodes.provinces.map((p) => p.code);
// 시군구는 시도마다 앞의 여러 곳을 채운다(마지막 몇 곳은 일부러 비운다).
const seen = new Map<string, number>();
for (const t of regionCodes.territories) {
  const c = seen.get(t.parentCode) ?? 0;
  if (c < 8) codes.push(t.code);
  seen.set(t.parentCode, c + 1);
}

// 시도는 모두 1위가 있어야 하므로 n을 건너뛰어 빈 지역 규칙(n % 6 === 5)을 피한다.
export const DUMMY_TERRITORY_OWNERS: readonly TerritoryOwner[] = codes
  .map((code, n) => (n < regionCodes.provinces.length ? build(code, n * 6) : build(code, n)))
  .filter((o): o is TerritoryOwner => o !== null);

export function getDummyOwner(regionCode: string): TerritoryOwner | null {
  return DUMMY_TERRITORY_OWNERS.find((o) => o.regionCode === regionCode) ?? null;
}
