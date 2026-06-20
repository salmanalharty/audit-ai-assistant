import type { ReactNode } from "react";

export function KpiCard({
  label,
  value,
  sub,
  icon,
  accent = "#1f3864",
  children,
}: {
  label: string;
  value?: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  accent?: string;
  children?: ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-5 flex items-center gap-4 animate-fade-in-up">
      {children ? (
        children
      ) : (
        <div
          className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${accent}1a`, color: accent }}
        >
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <p className="text-sm text-slate-500 mb-0.5">{label}</p>
        {value !== undefined && (
          <p className="nums text-2xl font-bold text-navy leading-tight">{value}</p>
        )}
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}
