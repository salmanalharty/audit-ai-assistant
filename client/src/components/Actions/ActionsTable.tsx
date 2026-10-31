// جدول الإجراءات التصحيحية مع اختيار متعدد.
// تخطيط ثابت: table-fixed + colgroup — لضمان محاذاة الأعمدة في RTL.
import { useMemo, useState } from "react";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  ShieldCheck,
} from "lucide-react";
import type { EffectiveAction } from "../../utils/workflow";
import { RiskBadge, ActionStateBadge } from "../common/Badge";
import { EmptyState } from "../common/EmptyState";
import { formatDate, formatLocalDate } from "../../utils/format";

const PER_PAGE = 12;

type SortKey =
  | "obsId"
  | "title"
  | "department"
  | "responsible"
  | "risk"
  | "due"
  | "overdue"
  | "state"
  | "extensions";

interface Col {
  key: SortKey | null;
  label: string;
  width: number;
  center?: boolean;
}

// مجموع العروض ≈ 1674px — الجدول يمرّر أفقياً عند الحاجة
const COLS: Col[] = [
  { key: null, label: "", width: 44, center: true },
  { key: "obsId", label: "معرّف الملاحظة", width: 120 },
  { key: "title", label: "عنوان الملاحظة", width: 220 },
  { key: null, label: "الإجراء التصحيحي", width: 260 },
  { key: "department", label: "الإدارة", width: 150 },
  { key: "responsible", label: "المسؤول عن التنفيذ", width: 140 },
  { key: "risk", label: "الخطر", width: 80, center: true },
  { key: "due", label: "تاريخ الاستحقاق", width: 120, center: true },
  { key: "overdue", label: "أيام التأخر", width: 90, center: true },
  { key: "state", label: "الحالة", width: 110, center: true },
  { key: "extensions", label: "التمديدات", width: 85, center: true },
  { key: null, label: "آخر تذكير", width: 110, center: true },
  { key: null, label: "الأدلة", width: 70, center: true },
];

const RISK_ORDER: Record<string, number> = { عالي: 3, متوسط: 2, منخفض: 1 };

function sortValue(a: EffectiveAction, key: SortKey): number | string {
  switch (key) {
    case "obsId":
      return a.obs.obsId;
    case "title":
      return a.obs.title;
    case "department":
      return a.obs.department;
    case "responsible":
      return a.obs.responsible;
    case "risk":
      return RISK_ORDER[a.obs.riskLevel] ?? 0;
    case "due":
      return a.dueDate ? a.dueDate.getTime() : 0;
    case "overdue":
      return a.overdueDays;
    case "state":
      return a.state;
    case "extensions":
      return a.extensions;
  }
}

export function ActionsTable({
  rows,
  selected,
  importedIds,
  onToggle,
  onTogglePage,
  onCheckEvidence,
}: {
  rows: EffectiveAction[];
  selected: Set<string>;
  /** معرّفات الملاحظات المستخرجة من تقارير PDF — تُميَّز بشارة */
  importedIds: Set<string>;
  onToggle: (obsId: string) => void;
  onTogglePage: (obsIds: string[], select: boolean) => void;
  /** فتح نافذة فحص كفاية أدلة الإغلاق لهذا الصف */
  onCheckEvidence: (action: EffectiveAction) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("overdue");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const va = sortValue(a, sortKey);
      const vb = sortValue(b, sortKey);
      const cmp =
        typeof va === "number" && typeof vb === "number"
          ? va - vb
          : String(va).localeCompare(String(vb), "ar");
      return dir === "asc" ? cmp : -cmp;
    });
  }, [rows, sortKey, dir]);

  const pages = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
  const safePage = Math.min(page, pages - 1);
  const slice = sorted.slice(safePage * PER_PAGE, safePage * PER_PAGE + PER_PAGE);
  const pageIds = slice.map((a) => a.obs.obsId);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));

  function toggleSort(k: SortKey | null) {
    if (!k) return;
    if (sortKey === k) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setDir("asc");
    }
    setPage(0);
  }

  if (rows.length === 0) {
    return <EmptyState message="لا توجد إجراءات تصحيحية مطابقة للفلاتر" />;
  }

  return (
    <div>
      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full table-fixed text-sm border-separate border-spacing-0 min-w-[1674px]">
          <colgroup>
            {COLS.map((c, i) => (
              <col key={i} style={{ width: `${c.width}px` }} />
            ))}
          </colgroup>
          <thead>
            <tr className="bg-navy-50 text-navy text-xs">
              {COLS.map((c, i) => (
                <th
                  key={i}
                  onClick={() => toggleSort(c.key)}
                  className={`font-semibold py-2.5 px-3 border-b border-s border-slate-200 ${
                    c.center ? "text-center" : "text-right"
                  } ${c.key ? "cursor-pointer select-none hover:bg-navy-50/60" : ""}`}
                >
                  {i === 0 ? (
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={(e) => onTogglePage(pageIds, e.target.checked)}
                      className="w-4 h-4 accent-[#1f3864] cursor-pointer align-middle"
                      aria-label="تحديد كل الصفحة"
                    />
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      {c.label}
                      {c.key &&
                        (sortKey === c.key ? (
                          dir === "asc" ? (
                            <ArrowUp size={12} />
                          ) : (
                            <ArrowDown size={12} />
                          )
                        ) : (
                          <ArrowUpDown size={12} className="text-slate-300" />
                        ))}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.map((a, idx) => {
              const isSelected = selected.has(a.obs.obsId);
              const extended =
                a.dueDate && a.originalDueDate
                  ? a.dueDate.getTime() !== a.originalDueDate.getTime()
                  : false;
              const zebra = idx % 2 ? "bg-slate-50/50" : "bg-white";
              return (
                <tr
                  key={a.obs.obsId}
                  className={isSelected ? "bg-navy-50/70" : zebra}
                  onClick={() => onToggle(a.obs.obsId)}
                >
                  <td className="py-2.5 px-3 text-center border-b border-s border-slate-100">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggle(a.obs.obsId)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 accent-[#1f3864] cursor-pointer align-middle"
                      aria-label={`تحديد ${a.obs.obsId}`}
                    />
                  </td>
                  <td className="py-2.5 px-3 border-b border-s border-slate-100">
                    <span className="nums text-slate-500 text-xs">{a.obs.obsId}</span>
                    {importedIds.has(a.obs.obsId) && (
                      <span
                        className="block text-[10px] text-gold-600 font-medium mt-0.5"
                        title={`مستخرجة من تقرير: ${a.obs.operationName}`}
                      >
                        مستوردة من PDF
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 border-b border-s border-slate-100 align-top">
                    <span className="line-clamp-2 font-medium text-slate-800" title={a.obs.title}>
                      {a.obs.title}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 border-b border-s border-slate-100 align-top">
                    <span className="line-clamp-2 text-slate-500" title={a.obs.recommendation}>
                      {a.obs.recommendation}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 border-b border-s border-slate-100 align-top">
                    <span className="line-clamp-2 text-slate-600" title={a.obs.department}>
                      {a.obs.department}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 border-b border-s border-slate-100 align-top">
                    <span className="text-slate-700" title={a.obs.email}>
                      {a.obs.responsible}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center border-b border-s border-slate-100">
                    <RiskBadge level={a.obs.riskLevel} />
                  </td>
                  <td className="py-2.5 px-3 text-center border-b border-s border-slate-100">
                    <span className={`nums ${a.isOverdue ? "text-red-600 font-semibold" : "text-slate-600"}`}>
                      {formatDate(a.dueDate)}
                    </span>
                    {extended && (
                      <span className="block text-[10px] text-gold-600 font-medium mt-0.5">ممدّد</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center border-b border-s border-slate-100">
                    {a.overdueDays > 0 ? (
                      <span className="nums text-red-600 font-bold">{a.overdueDays}</span>
                    ) : (
                      <span className="nums text-slate-400">0</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center border-b border-s border-slate-100">
                    <ActionStateBadge state={a.state} />
                  </td>
                  <td className="py-2.5 px-3 text-center border-b border-s border-slate-100">
                    <span className={`nums ${a.extensions >= 2 ? "text-amber-600 font-semibold" : "text-slate-500"}`}>
                      {a.extensions}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center border-b border-s border-slate-100">
                    {a.lastReminder ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-violet-700">
                        <Clock size={11} />
                        <span className="nums">{formatLocalDate(a.lastReminder)}</span>
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center border-b border-s border-slate-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCheckEvidence(a);
                      }}
                      title="فحص كفاية أدلة الإغلاق"
                      aria-label={`فحص أدلة ${a.obs.obsId}`}
                      className="p-1.5 rounded-lg text-cyan-700 hover:bg-cyan-50 border border-transparent hover:border-cyan-200"
                    >
                      <ShieldCheck size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-3 text-sm">
        <span className="text-slate-500 nums">
          {sorted.length} إجراء · صفحة {safePage + 1} من {pages}
        </span>
        {pages > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(0, safePage - 1))}
              disabled={safePage === 0}
              className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
              aria-label="السابق"
            >
              <ChevronRight size={16} />
            </button>
            <button
              onClick={() => setPage(Math.min(pages - 1, safePage + 1))}
              disabled={safePage >= pages - 1}
              className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
              aria-label="التالي"
            >
              <ChevronLeft size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
