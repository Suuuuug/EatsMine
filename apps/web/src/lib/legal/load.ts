import { readFileSync } from "node:fs";
import path from "node:path";
import { parseLegal, type LegalDoc } from "@/lib/legal/parse";

/** `src/content/legal/<name>.md`를 읽어 문서 구조로 바꾼다. 빌드 때 한 번 읽는다. */
export function loadLegal(name: "privacy" | "terms"): LegalDoc {
  const file = path.join(process.cwd(), "src", "content", "legal", `${name}.md`);
  return parseLegal(readFileSync(file, "utf8"));
}
