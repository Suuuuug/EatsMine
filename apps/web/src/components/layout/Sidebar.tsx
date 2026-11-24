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
      {/* 데스크톱 왼쪽 고정 사이드바 */}
      <aside
        aria-label="주요 메뉴"
        className="material-sidebar fixed top-0 left-0 z-40 hidden h-screen w-[76px] flex-col border-r border-line md:flex"
      >
        {/* 제일 상단 EatsMine 브랜드 로고 */}
        <Link
          href="/"
          aria-label="EatsMine 홈"
          className="pressable flex h-[76px] w-full shrink-0 flex-col items-center justify-center gap-1 border-b border-line focus-ring"
        >
          <Image
            src="/icon.svg"
            alt=""
            width={28}
            height={28}
            className="shrink-0 rounded-[7px]"
          />
          <span className="text-[11px] leading-none font-semibold tracking-tight text-foreground">
            EatsMine
          </span>
        </Link>

        {/* 로고 아래 지도 · 도감 · 마이페이지 아이콘 탭 */}
        <nav className="flex flex-1 flex-col">
          {NAV_ITEMS.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={
                  "flex h-[68px] w-full flex-col items-center justify-center gap-1.5 transition-colors focus-ring " +
                  (active
                    ? "bg-accent text-on-accent"
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
