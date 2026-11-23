import type { HTMLAttributes } from "react";

type GlassCardProps = HTMLAttributes<HTMLDivElement>;

/** 반투명 유리 카드 바탕. 안쪽 여백은 className 으로 지정하세요. (예: "p-6") */
export function GlassCard({ className = "", ...props }: GlassCardProps) {
  return <div className={`glass rounded-card ${className}`} {...props} />;
}
