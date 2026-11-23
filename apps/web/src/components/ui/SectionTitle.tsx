import { useId, type ReactNode } from "react";

type SectionTitleProps = {
  children: ReactNode;
  as?: "h1" | "h2" | "h3";
  className?: string;
};

/** 녹색 꺾쇠 장식(└ ┐)이 양옆에 붙은 섹션 제목 */
export function SectionTitle({ children, as: Tag = "h2", className = "" }: SectionTitleProps) {
  return (
    <div className={`relative mx-auto w-fit px-10 py-3 ${className}`}>
      <Bracket className="absolute bottom-0 left-0" />
      <Tag className="text-3xl font-semibold text-foreground text-shadow-title md:text-4xl">{children}</Tag>
      <Bracket className="absolute top-0 right-0 rotate-180" />
    </div>
  );
}

function Bracket({ className }: { className: string }) {
  const gradientId = useId();
  return (
    <svg aria-hidden="true" width="37" height="37" viewBox="0 0 73.5 74" fill="none" className={className}>
      <path
        d="M2.5 2.5V48.5C2.5 61.2026 12.7975 71.5 25.5 71.5H71"
        strokeWidth="5"
        strokeLinecap="round"
        stroke={`url(#${gradientId})`}
      />
      <defs>
        <linearGradient id={gradientId} x1="2" y1="0.5" x2="71" y2="71.5" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--color-accent)" />
          <stop offset="0.5" stopColor="white" stopOpacity="0.16" />
          <stop offset="1" stopColor="var(--color-accent-dark)" />
        </linearGradient>
      </defs>
    </svg>
  );
}
