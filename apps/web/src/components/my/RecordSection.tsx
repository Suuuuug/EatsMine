import Link from "next/link";
import type { ReactNode } from "react";
import { GlassCard } from "@/components/ui";

type RecordSectionProps = {
  id: string;
  title: string;
  /** 예: "43종 중 7종" */
  summary: string;
  href: string;
  children: ReactNode;
};

/** 내 영토·내 도감 구역. 제목 줄 오른쪽 '전체 보기'가 해당 화면으로 가는 유일한 링크다. */
export function RecordSection({ id, title, summary, href, children }: RecordSectionProps) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-3">
        <h2 id={id} className="scroll-mt-6 type-section text-foreground">{title}</h2>
        <Link href={href} className="pressable -mr-2 inline-flex min-h-11 items-center rounded-button px-2 type-row font-medium text-accent">
          전체 보기<span className="sr-only">, {title}</span>
        </Link>
      </div>
      <GlassCard className="flex flex-col gap-3 p-4">
        <p className="type-body font-semibold">{summary}</p>
        {children}
      </GlassCard>
    </section>
  );
}
