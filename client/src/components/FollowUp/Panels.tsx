import { useMemo } from "react";
import { ShieldAlert, Repeat, CalendarClock } from "lucide-react";
import type { FollowUpObservation } from "../../types/followup";
import { repeatFindings, chronicDeferral, unjustifiedList } from "../../utils/followupCalc";
import { RiskBadge, ObsStatusBadge } from "../common/Badge";
import { EmptyState } from "../common/EmptyState";

/** القسم الرابع: لوحة الملاحظات غير المبررة */
export function UnjustifiedPanel({ obs }: { obs: FollowUpObservation[] }) {
  const list = useMemo(() => unjustifiedList(obs), [obs]);
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50/70 p-5">
      <div className="flex items-center gap-2 mb-1">
        <ShieldAlert size={20} className="text-red-600" />
        <h3 className="font-bold text-red-700">⚠️ ملاحظات مفتوحة دون مبرر مقبول — تتطلب تصعيداً</h3>
      </div>
      <p className="text-[11px] text-red-600/80 mb-3">
        أخطر فئة: ملاحظات لم تُغلق وبلا تبرير. مرتّبة حسب درجة الخطر ثم أيام التأخر.
      </p>
      {list.length === 0 ? (
        <EmptyState message="لا توجد ملاحظات غير مبررة ✅" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-red-700/80 text-xs">
                <th className="text-right font-semibold py-2 px-3 border-b border-red-200">المعرّف</th>
                <th className="text-right font-semibold py-2 px-3 border-b border-red-200">العنوان</th>
                <th className="text-right font-semibold py-2 px-3 border-b border-red-200">العملية</th>
                <th className="text-right font-semibold py-2 px-3 border-b border-red-200">الإدارة</th>
                <th className="text-center font-semibold py-2 px-3 border-b border-red-200">الخطر</th>
                <th className="text-center font-semibold py-2 px-3 border-b border-red-200">أيام التأخر</th>
                <th className="text-center font-semibold py-2 px-3 border-b border-red-200">السنة</th>
              </tr>
            </thead>
            <tbody>
              {list.map((o, i) => (
                <tr key={o.obsId} className={i % 2 ? "bg-white/60" : "bg-white"}>
                  <td className="py-2 px-3 nums text-slate-500 border-b border-red-100 whitespace-nowrap">{o.obsId}</td>
                  <td className="py-2 px-3 font-medium text-slate-800 border-b border-red-100 max-w-[260px]">
                    <span className="line-clamp-2" title={o.title}>{o.title}</span>
                  </td>
                  <td className="py-2 px-3 text-slate-600 border-b border-red-100">{o.operationName}</td>
                  <td className="py-2 px-3 text-slate-600 border-b border-red-100">{o.department}</td>
                  <td className="py-2 px-3 text-center border-b border-red-100"><RiskBadge level={o.riskLevel} /></td>
                  <td className="py-2 px-3 text-center border-b border-red-100">
                    <span className="nums font-bold text-red-600">{o.overdueDays}</span>
                  </td>
                  <td className="py-2 px-3 text-center nums text-slate-600 border-b border-red-100">{o.year}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** الرسم 7: كاشف الملاحظات المتكررة */
export function RepeatFindings({ all }: { all: FollowUpObservation[] }) {
  const rows = useMemo(() => repeatFindings(all), [all]);
  if (rows.length === 0) return <EmptyState message="لا توجد ملاحظات متكررة" />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-navy-50 text-navy text-xs">
            <th className="text-right font-semibold py-2.5 px-3 border-b border-slate-200">عنوان الملاحظة المتكرر</th>
            <th className="text-right font-semibold py-2.5 px-3 border-b border-r border-slate-200">العملية</th>
            <th className="text-center font-semibold py-2.5 px-3 border-b border-r border-slate-200">عدد التكرارات</th>
            <th className="text-right font-semibold py-2.5 px-3 border-b border-r border-slate-200">السنوات</th>
            <th className="text-center font-semibold py-2.5 px-3 border-b border-r border-slate-200">الحالة الحالية</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const severe = r.count >= 3;
            return (
              <tr key={`${r.title}-${r.operationName}`} className={severe ? "bg-red-50/60" : i % 2 ? "bg-slate-50/60" : "bg-white"}>
                <td className="py-2.5 px-3 font-medium text-slate-800 border-b border-slate-100">
                  <span className="flex items-center gap-1.5">
                    {severe && <Repeat size={14} className="text-red-500 shrink-0" />}
                    {r.title}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-slate-600 border-b border-r border-slate-100">{r.operationName}</td>
                <td className="py-2.5 px-3 text-center border-b border-r border-slate-100">
                  <span
                    className="nums inline-flex items-center justify-center min-w-7 rounded-full px-2 py-0.5 text-xs font-bold"
                    style={severe ? { background: "#fde2e2", color: "#b91c1c" } : { background: "#e2e8f0", color: "#475569" }}
                  >
                    {r.count}×
                  </span>
                </td>
                <td className="py-2.5 px-3 nums text-slate-600 border-b border-r border-slate-100">{r.years.join("، ")}</td>
                <td className="py-2.5 px-3 text-center border-b border-r border-slate-100">
                  <ObsStatusBadge status={r.openNow ? "لم تغلق" : "مغلقة"} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5">
        <Repeat size={12} className="text-red-500" /> الملاحظات المتكررة 3 مرات أو أكثر تدل على فشل رقابي نظامي لم يُعالَج جذرياً.
      </p>
    </div>
  );
}

/** الرسم 9: تحليل التأجيل المزمن */
export function ChronicDeferral({ obs }: { obs: FollowUpObservation[] }) {
  const rows = useMemo(() => chronicDeferral(obs), [obs]);
  if (rows.length === 0) return <EmptyState message="لا توجد ملاحظات بتأجيل متكرر ✅" />;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {rows.map((o) => (
        <div key={o.obsId} className="flex gap-3 p-3 rounded-xl border border-amber-200 bg-amber-50/60">
          <CalendarClock size={18} className="text-amber-500 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-800 truncate" title={o.title}>{o.title}</p>
              <span className="nums shrink-0 text-xs font-bold text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">
                أُجّل {o.deferralCount}×
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{o.department}</p>
            <p className="text-xs text-slate-600 mt-1">{o.justification}</p>
            {o.newClosureDate !== "—" && (
              <p className="text-[11px] text-amber-700 mt-1">التاريخ الجديد للإغلاق: {o.newClosureDate}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
