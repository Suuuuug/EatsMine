import Link from "next/link";
import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";

type LegalPageProps = { title: string; children: ReactNode };

/** 개인정보처리방침·이용약관·문의하기가 함께 쓰는 글 화면. */
export function LegalPage({ title, children }: LegalPageProps) {
  return (
    <div className="em-theme my-backdrop min-h-dvh pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0 md:pl-[76px]">
      <Sidebar />
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 break-keep px-4 pt-4 pb-10 text-foreground lg:pt-8">
        <div>
          <Link href="/my" className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-button px-2 type-row font-medium text-accent [@media(hover:hover)]:hover:bg-foreground/5 active:bg-foreground/10 focus-visible:outline-2 focus-visible:outline-accent">
            <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 6-6 6 6 6" /></svg>
            마이페이지
          </Link>
          <h1 className="type-title mt-2 text-balance">{title}</h1>
        </div>
        {children}
      </main>
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="type-section">{title}</h2>
      <div className="flex flex-col gap-2 type-body text-foreground">{children}</div>
    </section>
  );
}
