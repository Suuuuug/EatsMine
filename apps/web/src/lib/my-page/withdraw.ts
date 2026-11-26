// 회원 탈퇴(DELETE /me). 서버가 계정과 내 기록(리뷰·사진·영토·도감·공유 링크)을 모두 지우고 204를 돌려준다.

export class WithdrawError extends Error {
  status: number;
  constructor(status: number) {
    super(`DELETE /me ${status}`);
    this.status = status;
  }
}

export function withdrawErrorText(error: unknown): string {
  if (error instanceof WithdrawError && error.status === 401) return "로그인이 만료됐어요. 다시 로그인해 주세요.";
  if (error instanceof WithdrawError && error.status === 429) return "요청이 많아요. 잠시 후 다시 시도해 주세요.";
  return "탈퇴하지 못했어요. 다시 눌러 주세요.";
}

export async function withdrawAccount(token: string, options: { apiBase?: string; fetcher?: typeof fetch } = {}): Promise<void> {
  const apiBase = options.apiBase ?? process.env.NEXT_PUBLIC_API_URL ?? "";
  const fetcher = options.fetcher ?? fetch;
  const response = await fetcher(`${apiBase}/me`, { method: "DELETE", cache: "no-store", headers: { authorization: `Bearer ${token}` } });
  if (!response.ok) throw new WithdrawError(response.status);
}
