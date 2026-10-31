// نافذة تأكيد الإجراء — خطوة «المراجعة قبل التنفيذ».
// تُظهر بالضبط كم ملاحظة ستتأثر وكم ستُتجاوَز ولماذا، قبل أي تغيير للحالة.
import { useMemo, useState } from "react";
import { AlertTriangle, X, Mail } from "lucide-react";
import type { ActionKind } from "../../types/actions";
import type { EffectiveAction } from "../../utils/workflow";
import { nextQuarterEnd } from "../../utils/workflow";
import { hasEmail } from "../../utils/emailTemplates";
import { formatDate } from "../../utils/format";
import { EVENT_COLORS } from "../../utils/theme";

/** هل ينطبق هذا الإجراء على هذه الملاحظة؟ (نفس منطق المحرك، بلا استثناءات) */
function applies(kind: ActionKind, a: EffectiveAction): boolean {
  switch (kind) {
    case "تذكير":
    case "تمديد":
      return a.isOpen;
    case "تصعيد":
      return a.isOpen && a.state !== "مصعّدة";
    case "إغلاق":
      return a.state !== "مغلقة";
    case "إعادة فتح":
      return a.state !== "قيد التنفيذ";
  }
}

const SKIP_REASON: Record<ActionKind, string> = {
  تذكير: "مغلقة بالفعل — لا تذكير لها",
  تمديد: "مغلقة بالفعل — لا تمديد لها",
  تصعيد: "مغلقة أو مصعّدة مسبقاً",
  إغلاق: "مغلقة بالفعل",
  "إعادة فتح": "قيد التنفيذ بالفعل",
};

const DESCRIPTION: Record<ActionKind, string> = {
  تذكير: "يُسجَّل تذكير بتاريخ اليوم لكل ملاحظة محدّدة، دون تغيير حالتها أو موعدها.",
  تمديد: "يُستبدَل موعد الإغلاق بالموعد الجديد ويزيد عدّاد التمديدات بواحد.",
  تصعيد: "تتحوّل الحالة إلى «مصعّدة» للعرض على الإدارة العليا.",
  إغلاق: "تتحوّل الحالة إلى «مغلقة» ويُثبَّت تاريخ الإغلاق.",
  "إعادة فتح": "تعود الحالة إلى «قيد التنفيذ» ويُلغى أثر الإغلاق أو التصعيد.",
};

export function ActionDialog({
  kind,
  rows,
  onConfirm,
  onCancel,
}: {
  kind: ActionKind;
  rows: EffectiveAction[];
  onConfirm: (ids: string[], newDueDate?: Date, withEmail?: boolean) => void;
  onCancel: () => void;
}) {
  const emailable = hasEmail(kind);
  const [withEmail, setWithEmail] = useState(true);
  const { affected, skipped } = useMemo(() => {
    const affected: EffectiveAction[] = [];
    const skipped: EffectiveAction[] = [];
    for (const a of rows) (applies(kind, a) ? affected : skipped).push(a);
    return { affected, skipped };
  }, [kind, rows]);

  // الموعد المقترح: نهاية الربع التالي للموعد الحالي (أو لليوم إن كان متأخراً)
  const suggested = useMemo(() => {
    const today = new Date();
    const latest = affected.reduce<Date>((acc, a) => {
      const d = a.dueDate;
      return d && d.getTime() > acc.getTime() ? d : acc;
    }, today);
    return nextQuarterEnd(latest);
  }, [affected]);

  const [dateValue, setDateValue] = useState(() => suggested.toISOString().slice(0, 10));

  const color = EVENT_COLORS[kind];
  const needsDate = kind === "تمديد";
  const parsedDate = needsDate ? new Date(`${dateValue}T00:00:00.000Z`) : undefined;
  const dateValid = !needsDate || (parsedDate !== undefined && !isNaN(parsedDate.getTime()));
  const canConfirm = affected.length > 0 && dateValid;

  return (
    <div
      className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <header
          className="flex items-center justify-between px-5 py-3.5 rounded-t-2xl text-white"
          style={{ backgroundColor: color }}
        >
          <h3 className="font-semibold">تأكيد الإجراء: {kind}</h3>
          <button onClick={onCancel} className="hover:bg-white/20 rounded-lg p-1" aria-label="إغلاق">
            <X size={18} />
          </button>
        </header>

        <div className="p-5 overflow-y-auto space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">{DESCRIPTION[kind]}</p>

          <div className="flex items-center gap-3 flex-wrap text-sm">
            <span className="inline-flex items-center gap-1.5 bg-navy-50 text-navy px-3 py-1.5 rounded-lg font-medium">
              <span className="nums font-bold">{affected.length}</span> ملاحظة ستتأثر
            </span>
            {skipped.length > 0 && (
              <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg">
                <AlertTriangle size={14} />
                <span className="nums font-bold">{skipped.length}</span> ستُتجاوَز —{" "}
                {SKIP_REASON[kind]}
              </span>
            )}
          </div>

          {needsDate && (
            <label className="block">
              <span className="text-sm text-slate-600 block mb-1.5">موعد الإغلاق الجديد</span>
              <input
                type="date"
                value={dateValue}
                onChange={(e) => setDateValue(e.target.value)}
                className="nums w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy"
              />
              <span className="text-xs text-slate-400 mt-1 block">
                المقترح افتراضياً: نهاية الربع التالي ({formatDate(suggested)})
              </span>
            </label>
          )}

          {affected.length > 0 && (
            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-48 overflow-y-auto">
              {affected.map((a) => (
                <div key={a.obs.obsId} className="px-3 py-2 text-xs flex items-start gap-2">
                  <span className="nums text-slate-400 shrink-0">{a.obs.obsId}</span>
                  <span className="text-slate-700 flex-1 line-clamp-1" title={a.obs.title}>
                    {a.obs.title}
                  </span>
                  <span className="text-slate-500 shrink-0">{a.obs.responsible}</span>
                </div>
              ))}
            </div>
          )}

          {affected.length === 0 && (
            <p className="text-sm text-amber-700 bg-amber-50 rounded-lg p-3">
              لا توجد ملاحظة ينطبق عليها هذا الإجراء ضمن ما حدّدته.
            </p>
          )}

          {emailable && affected.length > 0 && (
            <label className="flex items-start gap-2.5 text-sm text-slate-700 bg-navy-50/60 border border-navy/10 rounded-xl p-3 cursor-pointer">
              <input
                type="checkbox"
                checked={withEmail}
                onChange={(e) => setWithEmail(e.target.checked)}
                className="w-4 h-4 mt-0.5 accent-[#1f3864] cursor-pointer"
              />
              <span>
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <Mail size={14} className="text-navy" />
                  تجهيز مسودات المراسلات بعد التنفيذ
                </span>
                <span className="block text-xs text-slate-500 mt-0.5">
                  رسالة واحدة لكل مسؤول، تُعرض للمراجعة ولا تُرسَل تلقائياً.
                </span>
              </span>
            </label>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-slate-200">
          <button
            onClick={onCancel}
            className="text-sm text-slate-600 border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50"
          >
            إلغاء
          </button>
          <button
            disabled={!canConfirm}
            onClick={() =>
              onConfirm(
                affected.map((a) => a.obs.obsId),
                parsedDate,
                emailable && withEmail
              )
            }
            style={canConfirm ? { backgroundColor: color } : undefined}
            className={`text-sm font-medium px-4 py-2 rounded-lg ${
              canConfirm
                ? "text-white hover:brightness-110"
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            }`}
          >
            تنفيذ {kind}
          </button>
        </footer>
      </div>
    </div>
  );
}
