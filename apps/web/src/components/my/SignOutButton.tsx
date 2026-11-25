"use client";

import { ActionButton } from "@/components/em";
import { signOut } from "@/lib/auth/session";

export function SignOutButton() {
  return (
    <ActionButton variant="tinted" size="md" block onClick={() => void signOut()}>
      로그아웃
    </ActionButton>
  );
}
