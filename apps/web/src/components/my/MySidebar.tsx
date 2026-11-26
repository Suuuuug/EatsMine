"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { RecordShareSheet } from "@/components/share/RecordShareSheet";

/**
 * 마이페이지의 사이드바·상단 바. 로그인했으면 공유 버튼이 서비스 소개 대신 내 영토·내 도감 공유 시트를 연다.
 * 비로그인(예시)이면 공유할 내 기록이 없으므로 기본 공유(서비스 소개 링크)를 그대로 쓴다.
 */
export function MySidebar({ token }: { token: string | null }) {
  const [open, setOpen] = useState(false);
  if (!token) return <Sidebar />;
  return (
    <>
      <Sidebar onShare={() => setOpen(true)} shareLabel="내 기록 공유하기" />
      <RecordShareSheet open={open} onClose={() => setOpen(false)} token={token} />
    </>
  );
}
