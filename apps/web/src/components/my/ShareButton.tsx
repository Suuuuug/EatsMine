"use client";

import { useState } from "react";
import { Icon } from "@/components/icon/Icon";

type ShareButtonProps = {
  label: string;
  text: string;
};

type Result = { kind: "idle" } | { kind: "copied" } | { kind: "manual"; url: string };

// 휴대폰은 공유 시트, 공유를 못 쓰는 곳은 링크 복사. 복사도 막히면 주소를 그대로 보여 준다.
export function ShareButton({ label, text }: ShareButtonProps) {
  const [result, setResult] = useState<Result>({ kind: "idle" });

  async function share() {
    const url = window.location.origin + "/";
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "EatsMine", text, url });
        setResult({ kind: "idle" });
        return;
      } catch (error) {
        // 사용자가 공유 시트를 닫은 경우는 그대로 둔다.
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setResult({ kind: "copied" });
    } catch {
      setResult({ kind: "manual", url });
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={share}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-button bg-accent text-base font-semibold text-on-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:bg-accent-dark [@media(hover:hover)]:hover:bg-accent/90"
      >
        <Icon name="share" size={20} />
        {label}
      </button>
      <div aria-live="polite" className="min-h-6 text-center text-sm text-foreground">
        {result.kind === "copied" && "링크를 복사했어요"}
        {result.kind === "manual" && (
          <>
            <label htmlFor="share-url" className="block">이 주소를 복사해 주세요</label>
            <input
              id="share-url"
              readOnly
              value={result.url}
              onFocus={(event) => event.currentTarget.select()}
              className="mt-2 h-11 w-full rounded-input border border-foreground/30 bg-surface px-3 text-center text-base text-foreground"
            />
          </>
        )}
      </div>
    </div>
  );
}
