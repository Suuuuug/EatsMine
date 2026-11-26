"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionButton, BottomSheet } from "@/components/em";
import { signOut } from "@/lib/auth/session";
import { withdrawAccount, withdrawErrorText } from "@/lib/my-page/withdraw";

/** 안내 목록 맨 아래 줄. 자주 쓰지 않고 되돌릴 수 없어서 눈에 덜 띄게 두고, 누르면 한 번 더 확인한다. */
export function WithdrawRow({ token }: { token: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function close() {
    if (busy) return;
    setOpen(false);
    setError("");
  }

  async function withdraw() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await withdrawAccount(token);
      await signOut();
      router.replace("/");
    } catch (e) {
      setError(withdrawErrorText(e));
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-11 w-full cursor-pointer items-center px-4 py-3 text-left type-row text-muted [@media(hover:hover)]:hover:bg-foreground/5 active:bg-foreground/10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
      >
        회원 탈퇴
      </button>
      <BottomSheet
        open={open}
        onClose={close}
        title="정말 탈퇴할까요?"
        actions={
          <>
            <ActionButton variant="danger" size="lg" block disabled={busy} onClick={() => void withdraw()}>
              {busy ? "탈퇴하는 중이에요" : "탈퇴하기"}
            </ActionButton>
            <ActionButton variant="gray" size="lg" block disabled={busy} onClick={close}>
              취소
            </ActionButton>
          </>
        }
      >
        <div className="flex flex-col gap-2 break-keep">
          <p className="type-body">탈퇴하면 리뷰와 사진, 내 영토, 내 도감, 공유 링크가 모두 지워져요. 지운 기록은 되돌릴 수 없어요.</p>
          {error && (
            <p role="alert" className="type-caption text-danger">
              {error}
            </p>
          )}
        </div>
      </BottomSheet>
    </>
  );
}
