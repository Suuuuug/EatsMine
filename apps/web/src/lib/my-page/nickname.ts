// 닉네임 변경(PATCH /me). 규칙과 문구는 서버(apps/api profiles/me.controller.ts)와 같게 두어,
// 보내기 전에 화면에서 같은 이유를 먼저 알려 준다.

export const NICKNAME_MIN = 2;
export const NICKNAME_MAX = 12;

/** 서버와 같은 정리: 앞뒤 공백을 지우고 연속 공백을 하나로 모은다. */
export function normalizeNickname(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/**
 * 입력하는 동안 쓸 수 없는 글자는 걸러 내고 12자를 넘으면 더 쓰이지 않게 한다.
 * 쓰고 나서 오류로 알리지 않고 처음부터 못 쓰게 하면, 남는 오류는 "너무 짧음"뿐이다.
 * 붙여 넣은 글도 같은 규칙으로 정리한다.
 */
export function sanitizeNicknameInput(value: string): string {
  return value.replace(/[^가-힣a-zA-Z0-9 ]/g, "").replace(/\s{2,}/g, " ").slice(0, NICKNAME_MAX);
}

/** 쓸 수 없는 닉네임이면 무엇을 고칠지 한 문장, 괜찮으면 null. */
export function nicknameProblem(value: string): string | null {
  const nickname = normalizeNickname(value);
  if (nickname === "") return "닉네임을 입력해 주세요";
  if (nickname.length < NICKNAME_MIN) return `닉네임은 ${NICKNAME_MIN}자 이상이에요`;
  if (nickname.length > NICKNAME_MAX) return `닉네임은 ${NICKNAME_MAX}자 이하예요`;
  if (!/^[가-힣a-zA-Z0-9 ]+$/.test(nickname)) return "한글, 영문, 숫자만 쓸 수 있어요";
  return null;
}

export class NicknameError extends Error {
  status: number;
  constructor(status: number) {
    super(`PATCH /me ${status}`);
    this.status = status;
  }
}

/** 닉네임을 바꾸고 서버가 저장한 닉네임을 돌려준다. */
export async function updateNickname(
  token: string,
  nickname: string,
  options: { apiBase?: string; fetcher?: typeof fetch } = {},
): Promise<string> {
  const apiBase = options.apiBase ?? process.env.NEXT_PUBLIC_API_URL ?? "";
  const fetcher = options.fetcher ?? fetch;
  const response = await fetcher(`${apiBase}/me`, {
    method: "PATCH",
    cache: "no-store",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ nickname: normalizeNickname(nickname) }),
  });
  if (!response.ok) throw new NicknameError(response.status);
  return ((await response.json()) as { nickname: string }).nickname;
}
