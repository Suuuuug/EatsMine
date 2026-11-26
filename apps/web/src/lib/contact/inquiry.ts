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

/**
 * 문의를 보낸다. 백엔드가 아직 없어서 늘 "열리지 않았어요"를 돌려준다.
 * 연결할 때 이 함수만 실제 요청으로 바꾸면 화면은 그대로 쓴다.
 */
export async function sendInquiry(input: InquiryInput): Promise<InquiryResult> {
  void input;
  return { ok: false, reason: "unavailable" };
}
