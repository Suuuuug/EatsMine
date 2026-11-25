"use client";

import { useState } from "react";
import { ActionButton, useToast } from "@/components/em";
import { Icon } from "@/components/icon/Icon";

type ShareButtonProps = {
  label: string;
  text: string;
};

// 휴대폰은 공유 시트, 공유를 못 쓰는 곳은 링크 복사. 복사도 막히면 주소를 그대로 보여 준다.
// 결과는 화면이 바뀌지 않는 "복사했어요"만 토스트로 알린다(DESIGN.md §4).
export function ShareButton({ label, text }: ShareButtonProps) {
  const [manualUrl, setManualUrl] = useState<string | null>(null);
  const { show, toast } = useToast();

  async function share() {
    const url = window.location.origin + "/";
    setManualUrl(null);
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "EatsMine", text, url });
        return;
      } catch (error) {
        // 사용자가 공유 시트를 닫은 경우는 그대로 둔다.
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      show("링크를 복사했어요");
    } catch {
      setManualUrl(url);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <ActionButton variant="tinted" size="md" block onClick={share}>
        <Icon name="share" size={20} />
        {label}
      </ActionButton>
      {manualUrl && (
        <div className="flex flex-col gap-2">
          <label htmlFor="share-url" className="type-caption">이 주소를 복사해 주세요</label>
          <input
            id="share-url"
            readOnly
            value={manualUrl}
            onFocus={(event) => event.currentTarget.select()}
            className="field text-center"
          />
        </div>
      )}
      {toast}
    </div>
  );
}
