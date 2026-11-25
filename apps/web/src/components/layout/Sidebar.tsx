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
 * EatsMine 공통 왼쪽 슬림 사이드바 (모바일에서는 인라인 브랜드 마크 + 하단 유리 탭바)
 * - 데스크톱: 상단 EatsMine 로고 + 지도/도감/마이페이지 아이콘 탭 (material-sidebar)
 * - 모바일: 고정 상단바 없이 스크롤과 함께 올라가는 인라인 로고 + 하단 고정 유리 탭바 (glass-bar)
 */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* 모바일 전용 인라인 브랜드 마크 (고정 상단바 없이 본문 상단에서 자연스럽게 스크롤됨) */}
      <div className="flex items-center px-5 pt-3.5 pb-0.5 md:hidden">
        <Link
          href="/"
          aria-label="EatsMine 홈"
          className="pressable inline-flex items-center gap-2 rounded-input py-1 focus-ring"
        >
          <Image
            src="/icon.svg"
            alt=""
            width={22}
            height={22}
            className="shrink-0 object-contain"
          />
          <span className="text-[15px] leading-none font-bold tracking-tight text-foreground">
            EatsMine
          </span>
        </Link>
      </div>

      {/* 데스크톱 왼쪽 고정 사이드바 */}
      <aside
        aria-label="주요 메뉴"
        className="material-sidebar fixed top-0 bottom-0 left-0 z-40 hidden w-[76px] flex-col border-r border-line md:flex"
      >
        {/* 제일 상단 EatsMine 아이콘 로고 */}
        <Link
          href="/"
          aria-label="EatsMine 홈"
          className="pressable flex h-[76px] w-full shrink-0 items-center justify-center border-b border-line focus-ring"
        >
          <Image
            src="/icon.svg"
            alt=""
            width={34}
            height={34}
            className="shrink-0 object-contain"
          />
        </Link>

        {/* 지도 · 도감 · 마이페이지 */}
        <nav className="flex flex-1 flex-col gap-1.5 py-2.5">
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
                <span className="whitespace-nowrap text-xs leading-none font-medium tracking-tight">
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
              <span className="text-xs leading-none font-medium">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
