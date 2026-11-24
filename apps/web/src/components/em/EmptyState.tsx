import Image from "next/image";
import type { ReactNode } from "react";

export type EmptyIllustration =
  | "empty-visits"
  | "empty-dictionary"
  | "empty-bookmarks"
  | "empty-search"
  | "empty-reviews"
  | "load-error";

type EmptyStateProps = {
  illustration: EmptyIllustration;
  /** 무엇이 비었고 무엇을 하면 채워지는지 한 문장 */
  message: string;
  /** 첫 행동 하나 */
  action?: ReactNode;
  className?: string;
};

/** 빈 상태·오류: 그림 하나, 문장 하나, 행동 하나(앱인토스 가이드). 제목과 회색 부연을 따로 두지 않는다. */
export function EmptyState({ illustration, message, action, className = "" }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center gap-4 px-4 py-8 text-center ${className}`}>
      <Image src={`/images/illustrations/${illustration}.svg`} alt="" width={72} height={72} />
      <p className="max-w-xs type-body text-foreground [word-break:keep-all]">{message}</p>
      {action}
    </div>
  );
}
