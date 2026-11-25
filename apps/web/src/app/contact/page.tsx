import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/contact/ContactForm";
import { LegalPage } from "@/components/legal/LegalPage";
import { GlassCard } from "@/components/ui";

export const metadata: Metadata = { title: "문의하기 | EatsMine" };

const GUIDES = [
  { href: "/privacy", label: "개인정보처리방침" },
  { href: "/terms", label: "이용약관" },
] as const;

export default function ContactPage() {
  return (
    <LegalPage title="문의하기" layout="split">
      <GlassCard className="p-4 lg:p-6">
        <ContactForm />
      </GlassCard>
      <div className="flex flex-col gap-6 lg:gap-8">
        <GlassCard className="flex flex-col gap-2 p-4 lg:p-6">
          <h2 className="type-section">답변은 이렇게 드려요</h2>
          <p className="type-body">적어 주신 이메일로 답변을 보내요. 이메일이 맞는지 한 번 더 확인해 주세요.</p>
        </GlassCard>
        <GlassCard className="flex flex-col gap-2 p-4 lg:p-6">
          <h2 className="type-section">먼저 확인해 보세요</h2>
          <ul className="-mx-2 flex flex-col">
            {GUIDES.map(({ href, label }) => (
              <li key={href}>
                <Link href={href} className="flex min-h-11 items-center justify-between gap-3 rounded-button px-2 type-body [@media(hover:hover)]:hover:bg-foreground/5 active:bg-foreground/10 focus-visible:outline-2 focus-visible:outline-accent">
                  {label}
                  <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-muted"><path d="m9 6 6 6-6 6" /></svg>
                </Link>
              </li>
            ))}
          </ul>
        </GlassCard>
      </div>
    </LegalPage>
  );
}
