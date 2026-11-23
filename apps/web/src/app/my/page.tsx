import type { Metadata } from "next";
import { MyPageView } from "@/components/my/MyPageView";
import { getSession } from "@/lib/auth/session";
import { SAMPLE_MY_PAGE } from "@/lib/my-page/sample-data";

export const metadata: Metadata = {
  title: "마이페이지 | EatsMine",
};

export default function MyPage() {
  // 로그인(Supabase Google)과 API가 붙기 전까지는 늘 비로그인이고 예시 데이터로 그린다.
  // 붙으면 session으로 사용자 데이터를 조회해 member로 그린다. 로그인 뒤 모습은 /my/preview(개발 전용).
  const session = getSession();
  return <MyPageView data={SAMPLE_MY_PAGE} member={session !== null} />;
}
