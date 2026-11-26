/** 문의하기 입력 규칙과 전송 자리. 전송은 백엔드가 정해지면 `sendInquiry`만 바꾼다. */
export const INQUIRY_TYPES = [
  { value: "service", label: "서비스 이용" },
  { value: "error", label: "오류 신고" },
  { value: "privacy", label: "개인정보" },
  { value: "etc", label: "기타" },
] as const;

export type InquiryType = (typeof INQUIRY_TYPES)[number]["value"];
export const CONTENT_MAX = 1000;
export const CONTENT_MIN = 10;

export type InquiryInput = { type: InquiryType; email: string; content: string };
export type InquiryResult = { ok: true } | { ok: false; reason: "unavailable" | "network" };

export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export type InquiryErrors = { email?: string; content?: string };

/** 입력을 건드린 뒤에만 보여 줄 오류. 무엇이 틀렸고 어떻게 고치는지 한 문장. */
export function inquiryErrors(input: { email: string; content: string }): InquiryErrors {
  const errors: InquiryErrors = {};
  if (input.email.trim() === "") errors.email = "답변 받을 이메일을 적어 주세요";
  else if (!isEmail(input.email)) errors.email = "이메일 형식을 확인해 주세요";
  const length = input.content.trim().length;
  if (length < CONTENT_MIN) errors.content = `${CONTENT_MIN}자 이상 적어 주세요`;
  return errors;
}

export function canSubmit(input: { email: string; content: string; agreed: boolean }) {
  const errors = inquiryErrors(input);
  return input.agreed && !errors.email && !errors.content;
}

type SendOptions = {
  apiBase?: string;
  fetcher?: typeof fetch;
  /** 로그인했으면 보낸다(서버가 회원 ID를 메일에 참고로 적는다). 없어도 보낼 수 있다. */
  token?: string | null;
};

/**
 * 문의를 보낸다(POST /inquiries). 서버가 개발자 메일로 전달하고 DB에는 남기지 않는다.
 * API 주소가 없거나 서버가 거절하면(미설정 503, 메일 실패 502, 요청 제한 429 등) 같은 안내로 묶고,
 * 연결 자체가 끊기면 network로 알린다. 쓴 내용은 화면이 그대로 두므로 다시 보낼 수 있다.
 */
export async function sendInquiry(input: InquiryInput, options: SendOptions = {}): Promise<InquiryResult> {
  const apiBase = options.apiBase ?? process.env.NEXT_PUBLIC_API_URL ?? "";
  if (!apiBase) return { ok: false, reason: "unavailable" };
  const fetcher = options.fetcher ?? fetch;
  try {
    const response = await fetcher(`${apiBase}/inquiries`, {
      method: "POST",
      cache: "no-store",
      headers: { "content-type": "application/json", ...(options.token ? { authorization: `Bearer ${options.token}` } : {}) },
      body: JSON.stringify({ type: input.type, email: input.email.trim(), content: input.content.trim() }),
    });
    return response.ok ? { ok: true } : { ok: false, reason: "unavailable" };
  } catch {
    return { ok: false, reason: "network" };
  }
}
