"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icon/Icon";
import type { IconName } from "@/components/icon/names";
import { BrandWordmark } from "@/components/brand/BrandWordmark";
import { ShareIconButton, ShareRailButton } from "@/components/layout/ShareAction";

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
    return pathname === "/" || pathname.startsWith("/regions/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * EatsMine 공통 왼쪽 슬림 사이드바 (모바일에서는 인라인 브랜드 마크 + 하단 유리 탭바)
 * - 데스크톱: 상단 EatsMine 로고 + 지도/도감/마이페이지 아이콘 탭 (material-sidebar)
 * - 모바일: 고정하지 않는 56px 상단 바(워드마크 + 공유) + 하단 고정 유리 탭바 (glass-bar)
 */
type SidebarProps = {
  /** 이 화면만의 공유 동작(예: 마이의 내 기록 공유 시트). 없으면 서비스 소개 링크를 공유한다. */
  onShare?: () => void;
  /** onShare가 있을 때 공유 버튼의 화면 읽기 이름 */
  shareLabel?: string;
};

export function Sidebar({ onShare, shareLabel }: SidebarProps = {}) {
  const pathname = usePathname();

  return (
    <>
      {/*
        모바일 상단 바(고정하지 않음, 본문과 함께 스크롤). 토스 홈처럼 왼쪽에 워드마크 하나, 오른쪽에 동작 하나.
        높이 56px, 본문과 같은 16px 시작선, 누르는 영역 44px(링크·버튼 모두 안쪽 여백을 음수 여백으로 상쇄).
      */}
      <div className="flex h-14 items-center justify-between px-4 md:hidden">
        <Link
          href="/"
          aria-label="EatsMine 홈"
          className="pressable -ml-2 inline-flex min-h-11 items-center rounded-button px-2 focus-ring"
        >
          <BrandWordmark className="h-6 w-auto" />
        </Link>
        {/* 공유 버튼 뒤에 토스트 영역이 함께 렌더되므로 감싸서 아이콘 오른쪽 끝을 본문 끝선에 맞춘다 */}
        <div className="-mr-[11px] flex">
          <ShareIconButton onShare={onShare} label={shareLabel} />
        </div>
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
        <div className="pb-3">
          <ShareRailButton onShare={onShare} label={shareLabel} />
        </div>
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
                "pressable flex flex-1 flex-col items-center justify-center gap-1 transition-colors focus-ring " +
                (active ? "font-semibold text-accent-dark" : "text-muted hover:text-foreground")
              }
            >
              {/* 현재 탭은 아이콘 뒤 accent-weak 알약 + 굵은 글자(디자인 시스템 내비게이션, Material 3 활성 표시) */}
              <span
                className={
                  "flex h-7 w-14 items-center justify-center rounded-full transition-colors " +
                  (active ? "bg-accent-weak" : "")
                }
              >
                <Icon name={item.icon} size={20} />
              </span>
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
