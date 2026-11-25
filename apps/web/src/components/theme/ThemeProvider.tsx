"use client";

import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";
import { parseTheme, currentSeason, type Theme } from "@/lib/theme/theme";

const KEY = "eatsmine-theme";
const EVENT = "eatsmine-theme-change";
let fallback: Theme = "system";
function readTheme(): Theme {
  try { return parseTheme(localStorage.getItem(KEY)); } catch { return fallback; }
}
function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(EVENT, listener);
  return () => { window.removeEventListener("storage", listener); window.removeEventListener(EVENT, listener); };
}
function setTheme(theme: Theme) {
  fallback = theme;
  try { localStorage.setItem(KEY, theme); } catch { /* 저장이 불가능해도 현재 화면에는 적용한다. */ }
  window.dispatchEvent(new Event(EVENT));
}
const Context = createContext<{ theme: Theme; setTheme: (value: Theme) => void }>({ theme: "system", setTheme: () => {} });
export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore<Theme>(subscribe, readTheme, () => "system");
  useEffect(() => {
    document.documentElement.dataset.season = currentSeason();
    return () => { delete document.documentElement.dataset.season; };
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    return () => { delete document.documentElement.dataset.theme; };
  }, [theme]);
  return <Context.Provider value={{ theme, setTheme }}>{children}</Context.Provider>;
}
export function useTheme() { return useContext(Context); }
