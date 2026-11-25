"use client";

import { IconButton, useToast } from "@/components/em";
import { Icon } from "@/components/icon/Icon";

/** 어느 화면에서든 같은 문장을 공유한다. 개인 기록은 담지 않고 서비스 소개만 보낸다. */
const SHARE_TEXT = "EatsMine에서 지역과 제철음식을 골라 맛집을 찾아봐요";

// 휴대폰은 공유 시트, 공유를 못 쓰는 곳은 링크 복사. 복사도 막히면 주소를 그대로 보여 준다.
function useShare() {
  const { show, toast } = useToast();

  async function share() {
    const url = window.location.origin + "/";
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "EatsMine", text: SHARE_TEXT, url });
        return;
      } catch (error) {
        // 사용자가 공유 시트를 닫은 경우는 그대로 둔다.
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(`${SHARE_TEXT} ${url}`);
      show("링크를 복사했어요");
    } catch {
      window.prompt("이 주소를 복사해 주세요", url);
    }
  }

  return { share, toast };
}

/** 모바일 상단 오른쪽. 닫기·뒤로처럼 뜻이 알려진 공유 아이콘만 둔다. */
export function ShareIconButton({ className = "" }: { className?: string }) {
  const { share, toast } = useShare();
  return (
    <>
      <IconButton icon="share" label="EatsMine 공유하기" variant="plain" onClick={() => void share()} className={className} />
      {toast}
    </>
  );
}

/** PC 왼쪽 메뉴 아래. 메뉴 항목과 같은 크기·모양이다. */
export function ShareRailButton() {
  const { share, toast } = useShare();
  return (
    <>
      <button
        type="button"
        onClick={() => void share()}
        className="pressable mx-2 flex h-16 flex-col items-center justify-center gap-1.5 rounded-button text-muted transition-colors hover:text-foreground focus-ring"
      >
        <Icon name="share" size={22} />
        <span className="whitespace-nowrap text-xs leading-none font-medium tracking-tight">공유</span>
      </button>
      {toast}
    </>
  );
}
