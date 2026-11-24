import Link from "next/link";
import { Icon } from "@/components/icon/Icon";

/** 브랜드와 제목은 본문과 함께 스크롤된다. */
export function LargeTitleBar({ title }: { title: string }) {
  return (
    <>
      <header className="lg:hidden">
        <div className="mx-auto flex h-14 w-full max-w-2xl items-center px-4">
          <Link href="/" aria-label="EatsMine 홈" className="pressable inline-flex min-h-11 items-center gap-2 rounded-button px-2 font-semibold">
            <Icon name="eatsmine" size={24} />
            <span>EatsMine</span>
          </Link>
        </div>
      </header>
      <div className="mx-auto w-full max-w-2xl px-4 pt-7 lg:max-w-none lg:px-0 lg:pt-0">
        <h1 className="type-large-title">{title}</h1>
      </div>
    </>
  );
}
