import { formatPercent } from "../../utils/format";

/** شريط تقدّم خطي صغير (للجداول) */
export function ProgressBar({
  value,
  color = "#1f3864",
  showLabel = true,
}: {
  value: number; // 0..1
  color?: string;
  showLabel?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, value * 100));
  return (
    <div className="flex items-center gap-2 min-w-[90px]">
      <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      {showLabel && (
        <span className="nums text-xs text-slate-600 w-9 text-left">
          {formatPercent(value)}
        </span>
      )}
    </div>
  );
}

/** حلقة تقدّم دائرية (لبطاقات KPI) */
export function ProgressRing({
  value,
  size = 92,
  stroke = 9,
  color = "#1f3864",
}: {
  value: number; // 0..1
  size?: number;
  stroke?: number;
  color?: string;
}) {
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(1, value));
  const offset = circ * (1 - pct);
  return (
    <div className="relative inline-flex" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center nums text-lg font-bold text-navy">
        {formatPercent(value)}
      </span>
    </div>
  );
}
