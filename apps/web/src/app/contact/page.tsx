import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "문의하기 | EatsMine" };

export default function ContactPage() {
  return (
    <LegalPage title="문의하기">
      <p className="type-body">문의 창구를 준비하고 있어요. 열리면 여기서 바로 보낼 수 있어요.</p>
    </LegalPage>
  );
}
