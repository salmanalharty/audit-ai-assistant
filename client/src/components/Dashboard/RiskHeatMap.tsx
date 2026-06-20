import { useMemo, useState } from "react";
import type { AuditOperation, AuditType } from "../../types/audit";
import { AUDIT_TYPES } from "../../types/audit";
import { riskScoreColor } from "../../utils/theme";
import { EmptyState } from "../common/EmptyState";

/** خريطة مخاطر حرارية: الإدارات (رأسي) × النوع (أفقي)، الخلية = متوسط درجة المخاطر */
export function RiskHeatMap({ ops }: { ops: AuditOperation[] }) {
  const [hover, setHover] = useState<{ op: AuditOperation[]; label: string } | null>(
    null
  );

  const { departments, grid } = useMemo(() => {
    const deptSet = Array.from(new Set(ops.map((o) => o.department))).sort();
    const g: Record<string, Record<AuditType, AuditOperation[]>> = {};
    for (const dept of deptSet) {
      g[dept] = { "تقنية معلومات": [], مالية: [], مؤسسية: [] };
    }
    for (const o of ops) {
      if (g[o.department]) g[o.department][o.type].push(o);
    }
    return { departments: deptSet, grid: g };
  }, [ops]);

  if (departments.length === 0) return <EmptyState message="لا توجد بيانات" />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate" style={{ borderSpacing: "4px" }}>
        <thead>
          <tr>
            <th className="text-right text-xs text-slate-500 font-medium pe-2"> </th>
            {AUDIT_TYPES.map((t) => (
              <th key={t} className="text-xs text-slate-600 font-semibold px-1 pb-1">
                {t}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {departments.map((dept) => (
            <tr key={dept}>
              <td className="text-xs text-slate-700 pe-2 whitespace-nowrap max-w-[150px] truncate text-left" title={dept}>
                {dept}
              </td>
              {AUDIT_TYPES.map((t) => {
                const cellOps = grid[dept][t];
                if (cellOps.length === 0) {
                  return (
                    <td key={t}>
                      <div className="h-9 rounded-lg bg-slate-50 border border-slate-100" />
                    </td>
                  );
                }
                const avg =
                  cellOps.reduce((a, o) => a + o.riskScore, 0) / cellOps.length;
                return (
                  <td key={t} className="relative">
                    <div
                      className="h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white cursor-pointer transition-transform hover:scale-105"
                      style={{ backgroundColor: riskScoreColor(avg) }}
                      onMouseEnter={() =>
                        setHover({ op: cellOps, label: `${dept} — ${t}` })
                      }
                      onMouseLeave={() => setHover(null)}
                    >
                      <span className="nums">{Math.round(avg)}</span>
                    </div>
                    {hover && hover.label === `${dept} — ${t}` && (
                      <div className="absolute z-20 top-full mt-1 right-0 w-56 bg-white shadow-lg rounded-lg border border-slate-200 p-2.5 text-xs text-slate-700">
                        <p className="font-semibold text-navy mb-1">{hover.label}</p>
                        {cellOps.map((o) => (
                          <div key={o.id} className="flex justify-between gap-2 py-0.5">
                            <span className="truncate">{o.name}</span>
                            <span className="nums shrink-0">خطورة {o.riskScore}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center gap-2 mt-3 text-[11px] text-slate-500">
        <span>منخفض</span>
        <div
          className="h-2 flex-1 rounded-full max-w-[160px]"
          style={{
            background: "linear-gradient(to left, #10b981, #f59e0b, #ef4444)",
          }}
        />
        <span>عالي</span>
      </div>
    </div>
  );
}
