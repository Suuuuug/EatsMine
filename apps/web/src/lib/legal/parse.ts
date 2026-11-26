/** 약관·방침 마크다운(`# 제목`, `## 구역`, 문단, `- 목록`, `> 맺음말`)을 화면용 구조로 바꾼다. 다른 문법은 쓰지 않는다. */
export type LegalBlock =
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] };
export type LegalSectionData = { heading: string; blocks: LegalBlock[] };
export type LegalDoc = { title: string; sections: LegalSectionData[]; note: string };

export function parseLegal(markdown: string): LegalDoc {
  const doc: LegalDoc = { title: "", sections: [], note: "" };
  let section: LegalSectionData | null = null;
  let list: string[] | null = null;

  const endList = () => {
    if (section && list) section.blocks.push({ type: "ul", items: list });
    list = null;
  };

  for (const raw of markdown.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === "") {
      endList();
    } else if (line.startsWith("## ")) {
      endList();
      section = { heading: line.slice(3).trim(), blocks: [] };
      doc.sections.push(section);
    } else if (line.startsWith("# ")) {
      doc.title = line.slice(2).trim();
    } else if (line.startsWith("> ")) {
      endList();
      doc.note = line.slice(2).trim();
    } else if (line.startsWith("- ")) {
      if (!section) continue;
      list ??= [];
      list.push(line.slice(2).trim());
    } else if (section) {
      endList();
      section.blocks.push({ type: "p", text: line });
    }
  }
  endList();
  return doc;
}
