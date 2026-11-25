"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ActionButton, Checkbox, FilterChip, TextField } from "@/components/em";
import {
  CONTENT_MAX,
  INQUIRY_TYPES,
  canSubmit,
  inquiryErrors,
  sendInquiry,
  type InquiryInput,
  type InquiryResult,
  type InquiryType,
} from "@/lib/contact/inquiry";

type ContactFormProps = {
  /** 전송 방법. 백엔드가 정해지기 전에는 기본값이 "아직 열리지 않았어요"를 돌려준다. */
  send?: (input: InquiryInput) => Promise<InquiryResult>;
};

const FAILURE_TEXT = {
  unavailable: "문의 창구를 아직 열지 못했어요. 쓴 내용은 그대로 두었으니 나중에 다시 보내 주세요.",
  network: "연결이 불안정해요. 잠시 뒤에 다시 보내 주세요.",
} as const;

/** 문의 입력 폼. 입력을 건드리기 전에는 오류를 보이지 않고, 모두 맞아야 보내기가 켜진다. */
export function ContactForm({ send = sendInquiry }: ContactFormProps) {
  const [type, setType] = useState<InquiryType>("service");
  const [email, setEmail] = useState("");
  const [content, setContent] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [touched, setTouched] = useState({ email: false, content: false });
  // 보내기를 한 번 눌렀으면 모든 칸의 오류를 보여 준다.
  const [submitted, setSubmitted] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [failure, setFailure] = useState<keyof typeof FAILURE_TEXT | null>(null);

  const errors = inquiryErrors({ email, content });
  const ready = canSubmit({ email, content, agreed });
  const showContentError = (touched.content || submitted) && !!errors.content;
  const showAgreeError = submitted && !agreed;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (status === "sending") return;
    if (!ready) {
      // 막힌 이유를 보여 주고, 처음 고칠 칸으로 옮겨 준다.
      setSubmitted(true);
      document.getElementById(errors.email ? "contact-email" : errors.content ? "contact-content" : "contact-agree")?.focus();
      return;
    }
    setStatus("sending");
    setFailure(null);
    const result = await send({ type, email: email.trim(), content: content.trim() });
    if (result.ok) {
      setStatus("sent");
    } else {
      setStatus("idle");
      setFailure(result.reason);
    }
  }

  if (status === "sent") {
    return (
      <div role="status" className="flex flex-col gap-4">
        <h2 className="type-section">문의를 보냈어요</h2>
        <p className="type-body">답변은 적어 주신 이메일로 보내 드려요.</p>
        <Link href="/my" className="inline-flex h-11 items-center justify-center rounded-button bg-accent px-4 text-base font-semibold text-on-accent focus-ring active:opacity-70">
          마이페이지로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <fieldset className="flex min-w-0 flex-col gap-2">
        <legend className="mb-2 type-caption text-foreground">문의 종류</legend>
        <div className="flex flex-wrap gap-2">
          {INQUIRY_TYPES.map((item) => (
            <FilterChip key={item.value} selected={type === item.value} onSelectedChange={() => setType(item.value)}>
              {item.label}
            </FilterChip>
          ))}
        </div>
      </fieldset>

      <TextField
        label="답변 받을 이메일"
        type="email"
        inputMode="email"
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        onBlur={() => setTouched((t) => ({ ...t, email: true }))}
        error={touched.email || submitted ? errors.email : undefined}
        id="contact-email"
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="contact-content" className="type-caption text-foreground">문의 내용</label>
        <textarea
          id="contact-content"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, content: true }))}
          rows={7}
          maxLength={CONTENT_MAX}
          aria-invalid={showContentError ? true : undefined}
          aria-describedby="contact-content-message"
          className="field resize-none px-3.5 py-3 type-body"
        />
        <div id="contact-content-message" className="flex items-start justify-between gap-3 type-caption font-normal">
          <span className={showContentError ? "text-danger" : "text-muted"}>
            {showContentError ? errors.content : ""}
          </span>
          <span className="shrink-0 text-muted" aria-label={`${content.length}자, 최대 ${CONTENT_MAX}자`}>
            {content.length}/{CONTENT_MAX}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <Checkbox id="contact-agree" checked={agreed} onChange={(event) => setAgreed(event.target.checked)}>
          답변을 위한 개인정보(이메일, 문의 내용) 수집·이용에 동의해요
        </Checkbox>
        <Link href="/privacy" className="-mt-1 ml-9 inline-flex min-h-11 items-center self-start type-caption text-accent-dark underline underline-offset-2 focus-ring">
          개인정보처리방침 보기
        </Link>
        {showAgreeError && (
          <p className="ml-9 type-caption font-normal text-danger">동의해 주셔야 문의를 보낼 수 있어요</p>
        )}
      </div>

      {failure && (
        <p role="alert" className="rounded-button bg-danger-weak px-3.5 py-3 type-caption font-normal text-danger">
          {FAILURE_TEXT[failure]}
        </p>
      )}

      <ActionButton type="submit" size="lg" block disabled={status === "sending"}>
        {status === "sending" ? "보내는 중이에요" : "문의 보내기"}
      </ActionButton>
    </form>
  );
}
