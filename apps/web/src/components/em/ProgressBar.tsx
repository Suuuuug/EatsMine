type ProgressBarProps = {
  /** 무엇의 진행인지. 예: "칠한 영토" */
  label: string;
  value: number;
  max: number;
  /** 숫자를 읽는 단위. 예: "곳", "종" → "230곳 중 12곳" */
  unit: string;
  className?: string;
};

/** 진행 정도는 숫자 문장과 막대를 같이 둔다(색만으로 전하지 않는다). 강조색의 세 역할 중 '진행'. */
export function ProgressBar({ label, value, max, unit, className = "" }: ProgressBarProps) {
  const safeMax = Math.max(1, max);
  const clamped = Math.min(Math.max(value, 0), safeMax);
  const percent = Math.round((clamped / safeMax) * 100);

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="type-body font-medium text-foreground">{label}</span>
        <span className="type-caption text-muted tabular-nums">
          {max}
          {unit} 중 <strong className="font-semibold text-foreground">{clamped}{unit}</strong>
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={clamped}
        aria-valuetext={`${max}${unit} 중 ${clamped}${unit}`}
        className="h-2 overflow-hidden rounded-full bg-fill"
      >
        <div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
