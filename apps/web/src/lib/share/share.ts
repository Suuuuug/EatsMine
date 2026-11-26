// 내 영토·내 도감 공유. 공유 화면(GET /shares/:id)은 공개 리뷰로 얻은 기록만 보여 주므로
// 공유 시트의 미리보기도 같은 기준으로 만든다(보내는 사람이 본 것 = 받는 사람이 볼 것).

export type ShareType = "territory" | "collection";

type ReviewLike = { visibility: "private" | "public"; region_code?: string | null; food_name?: string | null };

/** 공개 리뷰에서 칠한 지역 코드와 모은 음식 이름(중복 없이, 처음 나온 순서). */
export function publicRecords(reviews: readonly ReviewLike[]): { regionCodes: string[]; foodNames: string[] } {
  const regions = new Set<string>();
  const foods = new Set<string>();
  for (const review of reviews) {
    if (review.visibility !== "public") continue;
    if (review.region_code) regions.add(review.region_code);
    if (review.food_name) foods.add(review.food_name);
  }
  return { regionCodes: [...regions], foodNames: [...foods] };
}

type Summary = { type: ShareType; nickname: string; count: number; total: number };

/** 공유할 때 함께 보내는 한 문장. 숫자에는 기준을 붙인다. */
export function shareMessage({ type, nickname, count, total }: Summary): string {
  if (type === "territory") {
    return count > 0 ? `${nickname}님은 전국 ${total}곳 중 ${count}곳을 칠했어요` : `${nickname}님은 이제 영토를 칠하기 시작했어요`;
  }
  return count > 0 ? `${nickname}님은 제철음식 ${total}종 중 ${count}종을 모았어요` : `${nickname}님은 이제 제철음식을 모으기 시작했어요`;
}

/** 카드 안 한 문장. 제목("OO님의 영토")에 이름이 있으므로 이름을 반복하지 않는다. */
export function recordLine({ type, count, total }: Omit<Summary, "nickname">): string {
  if (type === "territory") return count > 0 ? `전국 ${total}곳 중 ${count}곳을 칠했어요` : "아직 칠한 곳이 없어요";
  return count > 0 ? `제철음식 ${total}종 중 ${count}종을 모았어요` : "아직 모은 음식이 없어요";
}

export function shareTitle({ type, nickname }: { type: ShareType; nickname: string }): string {
  return type === "territory" ? `${nickname}님의 영토` : `${nickname}님의 도감`;
}

/** GET /shares/:id 응답 */
export type SharedView =
  | { type: "territory"; nickname: string; rank: string; rankLabel: string; count: number; total: number; regionCodes: string[] }
  | {
      type: "collection";
      nickname: string;
      rank: string;
      rankLabel: string;
      count: number;
      total: number;
      foods: { id: number; name: string; imageUrl: string | null }[];
    };

const SHARE_ID = /^[A-Za-z0-9]{10}$/;

/** 공유 화면 데이터. 없거나 꺼진 링크는 null. 서버·브라우저 어디서든 부른다. */
export async function fetchSharedView(apiBase: string, id: string): Promise<SharedView | null> {
  if (!apiBase || !SHARE_ID.test(id)) return null;
  const response = await fetch(`${apiBase}/shares/${encodeURIComponent(id)}`, { cache: "no-store" });
  if (response.status === 404 || response.status === 400) return null;
  if (!response.ok) throw new Error(`GET /shares/${id} ${response.status}`);
  return (await response.json()) as SharedView;
}

/** 공유 링크 만들기(이미 있으면 같은 링크). */
export async function createShareLink(apiBase: string, token: string, type: ShareType): Promise<{ id: string }> {
  const response = await fetch(`${apiBase}/me/shares`, {
    method: "POST",
    cache: "no-store",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ type }),
  });
  if (!response.ok) throw new Error(`POST /me/shares ${response.status}`);
  return (await response.json()) as { id: string };
}

/** 실제 공유 화면을 미리 읽어 누락된 기록이 없도록 한다. */
export async function loadSharePreview(apiBase: string, id: string): Promise<SharedView> {
  const view = await fetchSharedView(apiBase, id);
  if (!view) throw new Error("공유 링크가 없어요");
  return view;
}

export async function listShareLinks(apiBase: string, token: string): Promise<Record<ShareType, { id: string } | null>> {
  const response = await fetch(`${apiBase}/me/shares`, { cache: "no-store", headers: { authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error("공유 상태를 불러오지 못했어요");
  return response.json();
}

export async function removeShareLink(apiBase: string, token: string, type: ShareType): Promise<void> {
  const response = await fetch(`${apiBase}/me/shares/${type}`, { method: "DELETE", headers: { authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error("공유를 중지하지 못했어요");
}
