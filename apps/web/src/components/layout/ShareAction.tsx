"use client";

import { IconButton, useToast } from "@/components/em";
import { Icon } from "@/components/icon/Icon";

/** 기본 공유 문장. 개인 기록은 담지 않고 서비스 소개만 보낸다(마이처럼 화면이 onShare를 넘기면 그쪽이 정한다). */
const SHARE_TEXT = "EatsMine에서 지역과 제철음식을 골라 맛집을 찾아봐요";

type ShareLink = { title: string; text: string; url: string };

/**
 * 휴대폰은 시스템 공유 창, 못 쓰는 곳은 링크 복사. 복사도 막히면 주소를 그대로 보여 준다.
 * 공유 창을 닫았으면 "closed", 복사했으면 "copied"를 돌려준다(복사 알림은 부른 쪽이 띄운다).
 */
export async function shareOrCopy({ title, text, url }: ShareLink): Promise<"shared" | "copied" | "closed" | "prompted"> {
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title, text, url });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "closed";
    }
  }
  try {
    await navigator.clipboard.writeText(`${text} ${url}`);
    return "copied";
  } catch {
    window.prompt("이 주소를 복사해 주세요", url);
    return "prompted";
  }
}

function useShare() {
  const { show, toast } = useToast();

  async function share() {
    const result = await shareOrCopy({ title: "EatsMine", text: SHARE_TEXT, url: window.location.origin + "/" });
    if (result === "copied") show("링크를 복사했어요");
  }

  return { share, toast };
}

/** 모바일 상단 오른쪽. 닫기·뒤로처럼 뜻이 알려진 공유 아이콘만 둔다. */
export function ShareIconButton({ className = "", onShare, label = "EatsMine 공유하기" }: { className?: string; onShare?: () => void; label?: string }) {
  const { share, toast } = useShare();
  return (
    <>
      <IconButton icon="share" label={label} variant="plain" onClick={() => (onShare ? onShare() : void share())} className={className} />
      {toast}
    </>
  );
}

/** PC 왼쪽 메뉴 아래. 메뉴 항목과 같은 크기·모양이다. */
export function ShareRailButton({ onShare, label }: { onShare?: () => void; label?: string }) {
  const { share, toast } = useShare();
  return (
    <>
      <button
        type="button"
        aria-label={label}
        onClick={() => (onShare ? onShare() : void share())}
        className="pressable mx-2 flex h-16 w-[calc(100%-1rem)] flex-col items-center justify-center gap-1.5 rounded-button text-muted transition-colors hover:text-foreground focus-ring"
      >
        <Icon name="share" size={22} />
        <span className="whitespace-nowrap text-xs leading-none font-medium tracking-tight">공유</span>
      </button>
      {toast}
    </>
  );
}
