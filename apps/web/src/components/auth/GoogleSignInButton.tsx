"use client";

import { useState } from "react";
import { signInWithGoogle } from "@/lib/auth/google";

type Status = "idle" | "pending" | "not-configured" | "failed";

const messages: Record<Exclude<Status, "idle" | "pending">, string> = {
  "not-configured": "로그인 연결을 준비하고 있어요. 지금은 둘러보기만 할 수 있어요.",
  failed: "Google 로그인을 열지 못했어요. 잠시 뒤 다시 눌러 주세요.",
};

/**
 * Google 브랜드 규정의 어두운 테마 버튼(바탕 #131314, 테두리 #8E918F, 글자 #E3E3E3).
 * 브랜드 색이라 팀 토큰 대신 정해진 값을 쓴다.
 */
export function GoogleSignInButton({ next = "/my" }: { next?: string }) {
  const [status, setStatus] = useState<Status>("idle");

  async function start() {
    setStatus("pending");
    try {
      const result = await signInWithGoogle(next);
      setStatus(result.ok ? "idle" : result.reason);
    } catch {
      setStatus("failed");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={start}
        disabled={status === "pending"}
        className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-button border border-[#8E918F] bg-[#131314] text-base font-medium text-[#E3E3E3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:bg-[#1f1f20] disabled:opacity-60 [@media(hover:hover)]:hover:bg-[#1f1f20]"
      >
        <GoogleLogo />
        {status === "pending" ? "Google로 이동하는 중" : "Google로 계속하기"}
      </button>
      <p aria-live="polite" className="text-center text-sm text-foreground">
        {status === "not-configured" || status === "failed" ? messages[status] : ""}
      </p>
    </div>
  );
}

function GoogleLogo() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
