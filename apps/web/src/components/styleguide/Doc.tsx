import type { ReactNode } from "react";

type DocSectionProps = {
  id: string;
  title: string;
  /** 언제·어떻게 쓰는지. 문장 하나씩 */
  rules?: string[];
  children: ReactNode;
};

/** 스타일 가이드 한 구역: 제목, 쓰는 규칙, 실제로 조작되는 예시 */
export function DocSection({ id, title, rules, children }: DocSectionProps) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="flex scroll-mt-32 flex-col gap-6 lg:scroll-mt-20">
      <div className="flex flex-col gap-3">
        <h2 id={`${id}-title`} tabIndex={-1} className="type-title outline-none">
          {title}
        </h2>
        {rules && rules.length > 0 && (
          <ul className="flex max-w-2xl flex-col gap-2 type-body [word-break:keep-all]">
            {rules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        )}
      </div>
      {children}
    </section>
  );
}

/** 예시를 올려 두는 면. 내용 층이므로 유리가 아니라 불투명에 가까운 면(HIG Materials) */
export function Canvas({ label, children, className = "" }: { label?: string; children: ReactNode; className?: string }) {
  return (
    <div className="flex flex-col gap-2">
      {label && <h3 className="type-caption text-foreground">{label}</h3>}
      <div className={`rounded-card bg-surface p-5 shadow-[inset_0_0_0_1px_var(--color-line)] md:p-6 ${className}`}>{children}</div>
    </div>
  );
}

export function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-button bg-fill px-4 py-3 font-mono text-sm leading-5 text-foreground">
      <code>{children}</code>
    </pre>
  );
}
