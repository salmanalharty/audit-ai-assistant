import type { AuditOperation, AuditYear } from "../../types/audit";
import { STATUS_COLORS } from "../../utils/theme";
import { formatDate } from "../../utils/format";
import { EmptyState } from "../common/EmptyState";

const MONTHS = ["ينا", "فبر", "مار", "أبر", "ماي", "يون", "يول", "أغس", "سبت", "أكت", "نوف", "ديس"];

/** عرض زمني مبسّط (Gantt): أشرطة أفقية على محور أشهر السنة */
export function TimelineView({ ops, year }: { ops: AuditOperation[]; year: AuditYear }) {
  if (ops.length === 0) return <EmptyState message="لا توجد عمليات مطابقة للفلاتر" />;

  const yearStart = Date.UTC(year, 0, 1);
  const yearEnd = Date.UTC(year, 11, 31);
  const span = yearEnd - yearStart;
  const yearDays = span / 86400000;

  function pos(d: Date | null): number | null {
    if (!d) return null;
    return Math.max(0, Math.min(1, (d.getTime() - yearStart) / span));
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        {/* محور الأشهر */}
        <div className="flex border-b border-slate-200 pb-1 mb-2 ps-[200px]">
          {MONTHS.map((m) => (
            <div key={m} className="flex-1 text-center text-[11px] text-slate-400">
              {m}
            </div>
          ))}
        </div>

        <div className="space-y-1.5">
          {ops.map((o) => {
            const start = pos(o.startDate);
            const color = STATUS_COLORS[o.status]?.hex ?? "#9ca3af";
            const hasBar = start !== null;
            const right = hasBar ? start! * 100 : 0;
            const plannedW = (o.plannedDuration / yearDays) * 100;
            const actualW = (o.actualDuration / yearDays) * 100;
            const delayW = (o.delayDays / yearDays) * 100;
            const tip = `${o.name} — ${formatDate(o.startDate)} ← ${formatDate(o.endDate)} | مخطط ${o.plannedDuration}ي · فعلي ${o.actualDuration}ي${o.delayDays > 0 ? ` · تأخير ${o.delayDays}ي` : ""}`;
            return (
              <div key={o.id} className="flex items-center group">
                <div className="w-[200px] shrink-0 pe-3 text-xs text-slate-700 truncate" title={o.name}>
                  {o.name}
                </div>
                <div className="relative flex-1 h-6 bg-slate-50 rounded" title={tip}>
                  {hasBar && (
                    <>
                      {/* المخطط: شريط فاتح */}
                      <div
                        className="absolute top-1 h-4 rounded-md bg-slate-300"
                        style={{ right: `${right}%`, width: `${Math.max(0.8, plannedW)}%` }}
                      />
                      {/* الفعلي: شريط داكن ملوّن بالحالة */}
                      <div
                        className="absolute top-[7px] h-2.5 rounded-md transition-all group-hover:brightness-110"
                        style={{ right: `${right}%`, width: `${Math.max(0.8, actualW)}%`, backgroundColor: color }}
                      />
                      {/* تجاوز التأخير بالأحمر */}
                      {o.delayDays > 0 && (
                        <div
                          className="absolute top-[7px] h-2.5 rounded-l-md bg-red-500"
                          style={{ right: `${right + plannedW}%`, width: `${Math.max(0.6, delayW)}%` }}
                        />
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* مفتاح الألوان */}
        <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-slate-100">
          {Object.entries(STATUS_COLORS).map(([status, c]) => (
            <span key={status} className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <span className="w-3 h-3 rounded" style={{ backgroundColor: c.hex }} />
              {status}
            </span>
          ))}
          <span className="mx-2 text-slate-300">|</span>
          <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <span className="w-3 h-3 rounded bg-slate-300" /> المدة المخططة
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <span className="w-3 h-3 rounded bg-red-500" /> تجاوز التأخير
          </span>
        </div>
      </div>
    </div>
  );
}
