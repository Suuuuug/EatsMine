"use client";

import { useEffect } from "react";

/** 스크롤하는 동안 html에 data-scrolling을 붙여 얇은 스크롤바를 잠깐 보인다. 화면에는 아무것도 그리지 않는다. */
export function ScrollActivity() {
  useEffect(() => {
    const root = document.documentElement;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      root.setAttribute("data-scrolling", "");
      clearTimeout(timer);
      timer = setTimeout(() => root.removeAttribute("data-scrolling"), 1000);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(timer);
      root.removeAttribute("data-scrolling");
    };
  }, []);
  return null;
}
