"use client";
import { SegmentedControl } from "@/components/em/SegmentedControl";
import { useTheme } from "./ThemeProvider";
import type { Theme } from "@/lib/theme/theme";
const options: ReadonlyArray<{ value: Theme; label: string }> = [
  { value: "system", label: "자동" }, { value: "light", label: "라이트" }, { value: "dark", label: "다크" },
];
export function ThemeSettings() {
  const { theme, setTheme } = useTheme();
  return <section aria-labelledby="theme-title" className="flex flex-col gap-3"><h2 id="theme-title" className="type-section">화면 모드</h2><SegmentedControl label="화면 모드" options={options} value={theme} onValueChange={setTheme} /></section>;
}
