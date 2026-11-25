"use client";

import { createContext, useContext, useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import Image from "next/image";
import { Icon } from "@/components/icon/Icon";
import { SegmentedControl } from "@/components/em/SegmentedControl";
import { styleguideNav, styleguideSectionIds } from "./nav";

type Scheme = "system" | "light" | "dark";
const schemes = [
  { value: "system", label: "자동" },
  { value: "light", label: "밝게" },
  { value: "dark", label: "어둡게" },
] as const;

const SchemeContext = createContext<{ scheme: Scheme; setScheme: (scheme: Scheme) => void }>({
  scheme: "system",
  setScheme: () => {},
});

/** 화면 밝기 전환. 떠 있는 상단 바에 두지 않고 '색' 구역 안에 둔다(사용자 지시 2026-11-24). */
export function SchemeSwitch({ className = "" }: { className?: string }) {
  const { scheme, setScheme } = useContext(SchemeContext);
  return <SegmentedControl label="화면 밝기" options={schemes} value={scheme} onValueChange={setScheme} className={className} />;
}

/**
 * 브랜드 표시: 파비콘과 같은 앱 아이콘 타일(app/icon.svg) 하나.
 * 꾸밈용 색 상자 아이콘이 아니라 앱 아이콘이라 상자를 쓴다(독립 평가 2026-11-24: 박스형이 위계·macOS 관례에 맞음).
 */
function Brand({ label, className = "" }: { label: string; className?: string }) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <Image src="/icon.svg" alt="" width={28} height={28} className="shrink-0 object-contain" />
      <span className="truncate whitespace-nowrap type-row font-semibold">{label}</span>
    </span>
  );
}

const groupOf = (id: string) => styleguideNav.find((group) => group.items.some((item) => item.id === id)) ?? styleguideNav[0];

/**
 * 스타일 가이드 틀(성대공지 플랫폼과 같은 구조).
 * - 모든 화면에서: 햄버거 없이 아래 유리 탭 바로 묶음(기초·컴포넌트·EatsMine·참고)을 고르고,
 *   위쪽 칩 줄로 묶음 안의 항목을 고른다(HIG 탭 바·Material 내비게이션 바: 같은 단계 목적지 3~5개, 아이콘 + 짧은 라벨,
 *   SEED Tabs: 1차는 탭, 2차는 칩). 밝기 전환은 이동이 아니라 동작이라 탭 바에 두지 않는다.
 */
export function StyleguideShell({ children }: { children: ReactNode }) {
  const [scheme, setScheme] = useState<Scheme>("system");
  const [current, setCurrent] = useState(styleguideSectionIds[0]);
  const chipRowRef = useRef<HTMLDivElement>(null);
  const currentGroup = groupOf(current);
  // 묶음별로 마지막에 본 항목(HIG 탭 바: 탭을 오가도 각 영역의 위치를 지킨다)
  const [lastInGroup, setLastInGroup] = useState<Record<string, string>>({});
  if (lastInGroup[currentGroup.label] !== current) {
    setLastInGroup({ ...lastInGroup, [currentGroup.label]: current });
  }

  // 주소에 구역(#color)이 있으면 처음 열 때 그 구역으로 간다
  useEffect(() => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (id && styleguideSectionIds.includes(id)) document.getElementById(id)?.scrollIntoView({ block: "start" });
  }, []);

  // 마지막으로 누른 구역. 페이지 끝이라 그 구역이 위로 못 올라가도 표시를 유지한다
  const pickedRef = useRef<string | null>(null);

  // 스크롤 위치로 현재 구역을 계산한다: 상단 바 아래 기준선을 지난 마지막 구역(매번 전체를 다시 본다)
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      // 구역이 멈추는 위치(scroll-mt: 넓은 화면 80px, 좁은 화면 상단 바 아래 128px)보다 조금 아래
      const line = Math.max((document.querySelector("header")?.getBoundingClientRect().bottom ?? 0) + 40, 100);
      let id = styleguideSectionIds[0];
      for (const sectionId of styleguideSectionIds) {
        const el = document.getElementById(sectionId);
        if (el && el.getBoundingClientRect().top <= line) id = sectionId;
      }
      const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      if (atEnd && pickedRef.current) id = pickedRef.current;
      setCurrent(id);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const onUserScroll = () => {
      pickedRef.current = null;
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("wheel", onUserScroll, { passive: true });
    window.addEventListener("touchmove", onUserScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("wheel", onUserScroll);
      window.removeEventListener("touchmove", onUserScroll);
    };
  }, []);

  // 지금 구역의 칩이 칩 줄 밖에 있으면 보이게 옮긴다(가로 스크롤만, 페이지는 움직이지 않음)
  useEffect(() => {
    const row = chipRowRef.current;
    const chip = row?.querySelector<HTMLElement>(`[data-section="${current}"]`);
    if (!row || !chip) return;
    const left = chip.offsetLeft - row.offsetLeft;
    if (left < row.scrollLeft || left + chip.offsetWidth > row.scrollLeft + row.clientWidth) {
      row.scrollTo({ left: left - 16 });
    }
  }, [current]);

  function goTo(event: MouseEvent<HTMLAnchorElement>, id: string) {
    event.preventDefault();
    const target = document.getElementById(id);
    if (!target) return;
    target.scrollIntoView({ block: "start" });
    // 키보드 사용자가 고른 구역에서 이어서 탐색하도록 구역 제목으로 포커스를 옮긴다
    target.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true });
    history.replaceState(null, "", `#${id}`);
    pickedRef.current = id;
    setCurrent(id);
  }

  return (
    <SchemeContext.Provider value={{ scheme, setScheme }}>
    <div className="em-theme min-h-dvh [--em-bottom-bar:4rem]" data-theme-scope="local" data-scheme={scheme === "system" ? undefined : scheme}>
      <div>
        <header className="glass-bar sticky top-0 z-20 border-b border-line">
          <div className="mx-auto flex h-14 max-w-4xl items-center gap-3 px-4 md:px-8">
            <Brand label={currentGroup.label} />
          </div>
          {/* 지금 묶음 안의 항목(2차 이동) */}
          <nav aria-label={`${currentGroup.label} 항목`}>
            <div ref={chipRowRef} className="mx-auto flex max-w-4xl gap-2 overflow-x-auto px-4 pb-2.5 scrollbar-none md:px-8">
              {currentGroup.items.map((item) => {
                const active = current === item.id;
                return (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    data-section={item.id}
                    aria-current={active ? "true" : undefined}
                    onClick={(event) => goTo(event, item.id)}
                    className={
                      "relative inline-flex h-9 shrink-0 items-center rounded-full px-3.5 text-sm font-medium focus-ring " +
                      "before:absolute before:inset-x-0 before:-inset-y-1 before:content-[''] " +
                      (active ? "bg-foreground font-semibold text-background" : "bg-fill text-foreground active:opacity-70")
                    }
                  >
                    {item.label}
                  </a>
                );
              })}
            </div>
          </nav>
        </header>
        <main className="mx-auto flex max-w-4xl flex-col gap-20 px-4 pt-10 pb-[calc(var(--em-bottom-bar,0px)+env(safe-area-inset-bottom,0px)+5rem)] md:px-8">
          {children}
        </main>
      </div>

      {/* 아래 탭 바(1차 이동). 엄지가 닿는 곳 */}
      <nav
        aria-label="스타일 가이드 묶음"
        className="glass-bar fixed inset-x-0 bottom-0 z-30 border-t border-line pb-[env(safe-area-inset-bottom,0px)] select-none"
      >
        <ul className="mx-auto flex h-16 max-w-xl">
          {styleguideNav.map((group) => {
            const active = currentGroup.label === group.label;
            const target = group.items.find((item) => item.id === lastInGroup[group.label]) ?? group.items[0];
            return (
              <li key={group.label} className="flex-1">
                <a
                  href={`#${target.id}`}
                  aria-current={active ? "page" : undefined}
                  onClick={(event) => goTo(event, target.id)}
                  className="group flex h-full flex-col items-center justify-center gap-1 text-xs font-semibold text-muted focus-ring aria-[current=page]:text-foreground"
                >
                  <span className="flex h-8 w-14 items-center justify-center rounded-full transition-colors duration-150 group-aria-[current=page]:bg-accent-weak group-aria-[current=page]:text-accent-dark">
                    <Icon name={group.icon} size={22} />
                  </span>
                  {group.label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
    </SchemeContext.Provider>
  );
}
