"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icon/Icon";
import type { IconName } from "@/components/icon/names";

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "지도", icon: "map" },
  { href: "/dictionary", label: "도감", icon: "dex" },
  { href: "/my", label: "마이페이지", icon: "profile" },
];

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * EatsMine 공통 왼쪽 슬림 사이드바 (모바일에서는 하단 유리 탭바)
 * - 데스크톱: 상단 EatsMine 로고 + 지도/도감/마이페이지 아이콘 탭 (material-sidebar)
 * - 모바일: 하단 고정 유리 탭바 (glass-bar)
 */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      <header className="glass-bar fixed inset-x-0 top-0 z-40 flex h-14 items-center border-b border-line px-4 md:px-5">
        <Link href="/" aria-label="EatsMine 지도" className="focus-ring inline-flex min-h-11 items-center rounded-input">
          <Image src="/images/brand/eatsmine-wordmark-light.svg" alt="EatsMine" className="brand-light" width={108} height={34} priority />
          <Image src="/images/brand/eatsmine-wordmark.svg" alt="EatsMine" className="brand-dark" width={108} height={34} priority />
        </Link>
      </header>
      <aside aria-label="주요 메뉴" className="material-sidebar fixed bottom-0 left-0 top-14 z-30 hidden w-[76px] flex-col border-r border-line md:flex">
        {/* 지도 · 도감 · 마이페이지 */}
        <nav className="flex flex-1 flex-col">
          {NAV_ITEMS.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={
                  "mx-2 flex h-16 flex-col items-center justify-center gap-1.5 rounded-button transition-colors focus-ring " +
                  (active
                    ? "bg-accent-weak text-accent-dark"
                    : "pressable text-muted hover:text-foreground")
                }
              >
                <Icon name={item.icon} size={22} />
                <span className="whitespace-nowrap text-[11px] leading-none font-medium tracking-tight">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* 모바일 하단 고정 유리 탭바 */}
      <nav
        aria-label="주요 메뉴"
        className="glass-bar fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch border-t border-line pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {NAV_ITEMS.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={
                "pressable flex flex-1 flex-col items-center justify-center gap-1 border-t-2 transition-colors " +
                (active
                  ? "border-accent font-semibold text-accent-dark"
                  : "border-transparent text-muted hover:text-foreground")
              }
            >
              <Icon name={item.icon} size={20} />
              <span className="text-[11px] leading-none font-medium">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
