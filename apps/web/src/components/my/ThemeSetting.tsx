"use client";

import { SegmentedControl } from "@/components/em/SegmentedControl";
import { MySection } from "@/components/my/MySection";
import { GlassCard } from "@/components/ui";
import { useTheme } from "@/components/theme/ThemeProvider";
import type { Theme } from "@/lib/theme/theme";

const options: ReadonlyArray<{ value: Theme; label: string }> = [
  { value: "system", label: "자동" },
  { value: "light", label: "라이트" },
  { value: "dark", label: "다크" },
];

export function ThemeSetting({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  return (
    <MySection id="theme-title" title="화면 모드" className={className}>
      <GlassCard className="flex flex-1 items-center p-4">
        <div className="w-full">
          <SegmentedControl label="화면 모드" options={options} value={theme} onValueChange={setTheme} />
        </div>
      </GlassCard>
    </MySection>
  );
}
