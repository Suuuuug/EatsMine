import Link from "next/link";
import { WithdrawRow } from "@/components/my/WithdrawRow";
import { MySection } from "@/components/my/MySection";
import { GlassCard } from "@/components/ui";

const LINKS = [
  { href: "/privacy", label: "개인정보처리방침" },
  { href: "/terms", label: "이용약관" },
  { href: "/contact", label: "문의하기" },
] as const;

/** 리뷰 아래 안내 묶음. 모두 다른 화면으로 이동하는 줄이다. */
export function InfoLinks({ className, token }: { className?: string; token?: string | null }) {
  return (
    <MySection id="my-info" title="안내" className={className}>
      <GlassCard className="overflow-hidden">
        <ul className="flex flex-col divide-y divide-foreground/10">
          {LINKS.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex min-h-11 items-center justify-between gap-3 px-4 py-3 type-row [@media(hover:hover)]:hover:bg-foreground/5 active:bg-foreground/10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
              >
                {label}
                <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-muted">
                  <path d="m9 6 6 6-6 6" />
                </svg>
              </Link>
            </li>
          ))}
          {token && (
            <li>
              <WithdrawRow token={token} />
            </li>
          )}
        </ul>
      </GlassCard>
    </MySection>
  );
}
