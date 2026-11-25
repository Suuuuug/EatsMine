import type { Metadata } from "next";
import { MyPageContainer } from "@/components/my/MyPageContainer";

export const metadata: Metadata = {
  title: "마이페이지 | EatsMine",
};

// 로그인(Supabase Google)한 사람은 우리 API의 내 기록으로, 아닌 사람은 예시 화면과 로그인 버튼으로 그린다.
export default function MyPage() {
  return <MyPageContainer />;
}
