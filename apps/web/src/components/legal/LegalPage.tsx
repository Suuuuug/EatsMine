import Link from "next/link";
import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { GlassCard } from "@/components/ui";

type LegalPageProps = {
  title: string;
  note?: string;
  /** columns: 글이 두 열로 흐른다(방침·약관). split: 두 칸을 나란히 둔다(문의하기). */
  layout?: "columns" | "split";
  children: ReactNode;
};

/**
 * 개인정보처리방침·이용약관·문의하기가 함께 쓰는 글 화면.
 * 폭과 좌우 여백은 마이페이지와 같고, PC에서는 구역을 두 열로 흘려서 빈 곳 없이 채운다.
 */
export function LegalPage({ title, note, layout = "columns", children }: LegalPageProps) {
  return (
    <div className="em-theme my-backdrop min-h-dvh pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0 md:pl-[76px]">
      <Sidebar />
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 break-keep px-4 pt-4 pb-10 text-foreground lg:max-w-6xl lg:px-8 lg:pt-8 2xl:px-12">
        <div>
          <Link href="/my" className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-button px-2 type-row font-medium text-accent [@media(hover:hover)]:hover:bg-foreground/5 active:bg-foreground/10 focus-visible:outline-2 focus-visible:outline-accent">
            <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 6-6 6 6 6" /></svg>
            마이페이지
          </Link>
          <h1 className="type-title mt-2 text-balance">{title}</h1>
        </div>
        {layout === "split" ? (
          <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-8">{children}</div>
        ) : (
          <div className="flex flex-col gap-6 lg:block lg:columns-2 lg:gap-x-8 lg:[&>*]:mb-8">{children}</div>
        )}
        {note && <p className="type-caption text-muted">{note}</p>}
      </main>
    </div>
  );
}

/** 구역 하나. 카드 안에서 쪼개지지 않아 두 열에서도 한 구역이 한 덩어리로 보인다. */
export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="break-inside-avoid">
      <GlassCard className="flex flex-col gap-2 p-4 lg:p-6">
        <h2 className="type-section">{title}</h2>
        <div className="flex flex-col gap-2 type-body text-foreground">{children}</div>
      </GlassCard>
    </section>
  );
}
