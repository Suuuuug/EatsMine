import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "이용약관 | EatsMine" };

export default function TermsPage() {
  return (
    <LegalPage title="이용약관">
      <LegalSection title="서비스">
        <p>EatsMine은 지역과 제철 음식을 찾고, 내가 다녀온 곳을 기록하는 서비스예요.</p>
      </LegalSection>
      <LegalSection title="식당 정보">
        <p>식당 정보와 매출 순위는 잇플 제공 정보를 바탕으로 해요. 실제 영업시간이나 만족도와 다를 수 있어요.</p>
        <p>예약·결제는 잇플 상세 페이지에서 이뤄지고, EatsMine은 관여하지 않아요.</p>
      </LegalSection>
      <LegalSection title="후기와 기록">
        <p>내가 쓴 후기와 기록의 책임은 나에게 있어요. 다른 사람을 해치거나 광고인 글은 지울 수 있어요.</p>
      </LegalSection>
      <LegalSection title="이용 제한">
        <p>자동으로 대량 수집하거나 부정한 방법으로 이용하면 이용을 막을 수 있어요.</p>
      </LegalSection>
      <LegalSection title="변경">
        <p>약관이 바뀌면 시행 전에 이 화면에서 알려요.</p>
      </LegalSection>
      <p className="type-caption text-muted">시행일 2026년 11월 25일 · 팀 검토 전 초안이에요.</p>
    </LegalPage>
  );
}
