"use client";

import { useState } from "react";
import { devLoginCredentials, signInAsTestUser } from "@/lib/auth/dev-login";
import { signOut, useSession } from "@/lib/auth/session";

/**
 * ⚠️ 개발용 임시 버튼: 화면 오른쪽 아래에서 테스트 계정으로 로그인·로그아웃한다.
 * `next dev`이고 .env.local에 테스트 계정이 있을 때만 보인다. 정식 로그인 화면이 생기면 지운다.
 */
export function DevLoginButton() {
  const session = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!devLoginCredentials() || session.status !== "ready") return null;
  const user = session.session?.user ?? null;

  const handleClick = async () => {
    setBusy(true);
    setError("");
    if (user) await signOut();
    else {
      const result = await signInAsTestUser();
      if (!result.ok) setError(result.message);
    }
    setBusy(false);
  };

  return (
    // Next 개발 표시(오른쪽 아래 N 버튼)와 겹치지 않게 그 위에 둔다.
    <div className="fixed right-4 bottom-20 z-[60] flex flex-col items-end gap-1.5">
      {error && (
        <p role="alert" className="max-w-64 rounded-input bg-surface px-3 py-2 type-caption text-danger shadow-float">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        title={user ? user.email : "개발용 테스트 계정으로 로그인"}
        className="pressable rounded-full border border-dashed border-accent bg-surface px-4 py-2.5 type-caption font-semibold text-accent-dark shadow-float focus-ring disabled:opacity-60"
      >
        {busy ? "처리 중…" : user ? "테스트 로그아웃" : "테스트 로그인"}
      </button>
    </div>
  );
}
