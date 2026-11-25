import type { ReactNode } from "react";

type MySectionProps = {
  id: string;
  title: string;
  /** 제목 줄 오른쪽 조작(예: 전체 보기). */
  action?: ReactNode;
  className?: string;
  children: ReactNode;
};

/**
 * 마이페이지 구역 하나. 제목 줄 높이(44px)와 제목-카드 간격이 모든 구역에서 같아서
 * 두 열로 놓아도 제목과 카드 위·아래 선이 맞는다. 카드는 flex-1로 늘어나 같은 줄의 카드와 아래 끝을 맞춘다.
 */
export function MySection({ id, title, action, className = "", children }: MySectionProps) {
  return (
    <section aria-labelledby={id} className={`flex min-w-0 flex-col gap-1 ${className}`}>
      <div className="flex min-h-11 items-center justify-between gap-3">
        <h2 id={id} tabIndex={-1} className="scroll-mt-6 type-section text-foreground outline-none">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
