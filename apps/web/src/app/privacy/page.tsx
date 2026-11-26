import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/LegalDocument";

export const metadata: Metadata = { title: "개인정보처리방침 | EatsMine" };

export default function PrivacyPage() {
  return <LegalDocument name="privacy" />;
}
