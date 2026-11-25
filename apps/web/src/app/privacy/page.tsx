import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "개인정보처리방침 | EatsMine" };

export default function PrivacyPage() {
  return (
    <LegalPage title="개인정보처리방침">
      <LegalSection title="받는 정보">
        <p>Google 로그인으로 이름, 이메일, 프로필 사진을 받아요.</p>
        <p>서비스를 쓰면서 남기는 방문 지역, 수집한 음식, 후기도 저장해요.</p>
        <p>이용 흐름을 개선하려고 식별되지 않는 이용 기록(화면 이동, 잇플 이동 횟수)을 남겨요.</p>
      </LegalSection>
      <LegalSection title="쓰는 곳">
        <p>로그인, 마이페이지 기록 보여주기, 후기 공개, 서비스 개선에만 써요.</p>
      </LegalSection>
      <LegalSection title="보관 기간">
        <p>탈퇴하면 계정 정보와 내 기록을 지워요. 식별되지 않는 이용 기록은 통계로만 남겨요.</p>
      </LegalSection>
      <LegalSection title="제3자 제공">
        <p>법령에 따른 요청이 아니면 다른 곳에 넘기지 않아요. 잇플 상세 페이지로 이동할 때는 내 정보를 보내지 않아요.</p>
      </LegalSection>
      <LegalSection title="문의">
        <p>개인정보 관련 문의는 문의하기에서 받아요.</p>
      </LegalSection>
      <p className="type-caption text-muted">시행일 2026년 11월 25일 · 팀 검토 전 초안이에요.</p>
    </LegalPage>
  );
}
