import { LegalPage, LegalSection } from "@/components/legal/LegalPage";
import { loadLegal } from "@/lib/legal/load";

/** `src/content/legal/*.md`의 글을 구역 카드로 그린다. 글은 마크다운에서만 고친다. */
export function LegalDocument({ name }: { name: "privacy" | "terms" }) {
  const doc = loadLegal(name);
  return (
    <LegalPage title={doc.title} note={doc.note}>
      {doc.sections.map((section) => (
        <LegalSection key={section.heading} title={section.heading}>
          {section.blocks.map((block, i) =>
            block.type === "p" ? (
              <p key={i}>{block.text}</p>
            ) : (
              <ul key={i} className="flex list-disc flex-col gap-1.5 pl-5 marker:text-muted">
                {block.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ),
          )}
        </LegalSection>
      ))}
    </LegalPage>
  );
}
