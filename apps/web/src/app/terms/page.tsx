import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/LegalDocument";

export const metadata: Metadata = { title: "이용약관 | EatsMine" };

export default function TermsPage() {
  return <LegalDocument name="terms" />;
}
