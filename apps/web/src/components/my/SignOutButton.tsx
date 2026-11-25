"use client";

import { ActionButton } from "@/components/em";
import { signOut } from "@/lib/auth/session";

export function SignOutButton() {
  return (
    // 자주 쓰지 않는 동작이라 프로필 줄 오른쪽의 글자 버튼으로 둔다(주목도 낮게).
    <ActionButton variant="plain" size="sm" className="-mr-3.5 shrink-0" onClick={() => void signOut()}>
      로그아웃
    </ActionButton>
  );
}
