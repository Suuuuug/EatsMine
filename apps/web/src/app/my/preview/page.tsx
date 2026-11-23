import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MyPageView } from "@/components/my/MyPageView";
import { SAMPLE_MY_PAGE } from "@/lib/my-page/sample-data";

export const metadata: Metadata = {
  title: "마이페이지 로그인 미리보기 | EatsMine",
  robots: { index: false },
};

// 로그인한 뒤 마이페이지 모습을 개발 중에 보기 위한 화면. 운영 빌드에서는 404다.
// 데이터는 예시이고 화면에도 예시라고 표시한다.
export default function MyPagePreview() {
  if (process.env.NODE_ENV === "production") notFound();
  return <MyPageView data={SAMPLE_MY_PAGE} member />;
}
