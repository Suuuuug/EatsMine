import type { Metadata } from "next";
import Link from "next/link";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { Icon } from "@/components/icon/Icon";
import { isGoogleSignInConfigured } from "@/lib/auth/google";

export const metadata: Metadata = {
  title: "로그인 | EatsMine",
};

export default function LoginPage() {
  const ready = isGoogleSignInConfigured();
  return (
    <div className="em-theme flex flex-1 flex-col">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col bg-background px-4 break-keep text-foreground">
      <div className="flex flex-1 flex-col justify-center gap-5 py-12">
        <Icon name="eatsmine" size={64} className="text-foreground" />
        <h1 className="type-title text-balance">
          {ready ? "Google 계정으로 시작해요" : "로그인을 준비하고 있어요"}
        </h1>
      </div>
      <div className="flex flex-col gap-4 pb-[max(24px,env(safe-area-inset-bottom))]">
        <GoogleSignInButton next="/my" />
        <p className="text-center type-caption font-normal text-muted">이름, 이메일, 프로필 사진만 받아요</p>
        <Link href="/" className="pressable mx-auto inline-flex min-h-11 items-center rounded-button px-3 type-body text-foreground">
          로그인 없이 둘러보기
        </Link>
      </div>
      </main>
    </div>
  );
}
