import { useState, useMemo } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from "lucide-react";
import type { AuditOperation } from "../../types/audit";
import { StatusBadge, RiskBadge, PhaseBadge } from "../common/Badge";
import { ProgressBar } from "../common/ProgressBar";
import { formatDate } from "../../utils/format";
import { EmptyState } from "../common/EmptyState";

type SortKey = keyof AuditOperation;
const PER_PAGE = 10;

interface Col {
  key: SortKey;
  label: string;
  sortable?: boolean;
}

const COLS: Col[] = [
  { key: "id", label: "#", sortable: true },
  { key: "name", label: "اسم العملية", sortable: true },
  { key: "type", label: "النوع", sortable: true },
  { key: "department", label: "الإدارة", sortable: true },
  { key: "owner", label: "المسؤول", sortable: true },
  { key: "status", label: "الحالة", sortable: true },
  { key: "riskLevel", label: "الخطورة", sortable: true },
  { key: "riskScore", label: "درجة المخاطر", sortable: true },
  { key: "startDate", label: "البداية", sortable: true },
  { key: "endDate", label: "النهاية", sortable: true },
  { key: "quarter", label: "الربع", sortable: true },
  { key: "plannedDuration", label: "المخططة", sortable: true },
  { key: "actualDuration", label: "الفعلية", sortable: true },
  { key: "delayDays", label: "أيام التأخير", sortable: true },
  { key: "completion", label: "الإنجاز", sortable: true },
  { key: "phase", label: "المرحلة", sortable: true },
  { key: "findings", label: "الملاحظات", sortable: true },
  { key: "criticalFindings", label: "حرجة", sortable: true },
  { key: "totalRecs", label: "التوصيات", sortable: true },
  { key: "closedRecs", label: "المغلقة", sortable: true },
  { key: "recClosureRate", label: "إغلاق التوصيات", sortable: true },
  { key: "comments", label: "تعليقات" },
];

// عرض ثابت لكل عمود (بترتيب COLS) — يضمن تطابق رؤوس الأعمدة مع البيانات (table-fixed)
const COL_WIDTHS = [44, 200, 110, 150, 130, 95, 80, 85, 95, 95, 60, 80, 80, 95, 130, 100, 90, 70, 95, 85, 130, 200];
const TABLE_WIDTH = COL_WIDTHS.reduce((a, b) => a + b, 0);

export function DataTable({ ops }: { ops: AuditOperation[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("id");
  const [dir, setDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    const arr = [...ops].sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      let cmp = 0;
      if (va instanceof Date || vb instanceof Date) {
        cmp = (va ? (va as Date).getTime() : 0) - (vb ? (vb as Date).getTime() : 0);
      } else if (typeof va === "number" && typeof vb === "number") {
        cmp = va - vb;
      } else {
        cmp = String(va).localeCompare(String(vb), "ar");
      }
      return dir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [ops, sortKey, dir]);

  const pages = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
  const safePage = Math.min(page, pages - 1);
  const slice = sorted.slice(safePage * PER_PAGE, safePage * PER_PAGE + PER_PAGE);

  function toggleSort(key: SortKey, sortable?: boolean) {
    if (!sortable) return;
    if (sortKey === key) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setDir("asc");
    }
    setPage(0);
  }

  if (ops.length === 0) return <EmptyState message="لا توجد عمليات مطابقة للفلاتر" />;

  return (
    <div>
      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table
          className="text-sm border-separate border-spacing-0 table-fixed [&_th]:border-l [&_th]:border-b [&_th]:border-slate-200/70 [&_td]:border-l [&_td]:border-b [&_td]:border-slate-100 [&_td]:align-middle"
          style={{ width: TABLE_WIDTH }}
        >
          <colgroup>
            {COL_WIDTHS.map((w, i) => (
              <col key={i} style={{ width: w }} />
            ))}
          </colgroup>
          <thead>
            <tr className="bg-navy-50 text-navy text-xs">
              {COLS.map((c) => (
                <th
                  key={c.key}
                  onClick={() => toggleSort(c.key, c.sortable)}
                  className={`text-right font-semibold py-2.5 px-3 ${
                    c.sortable ? "cursor-pointer select-none hover:bg-navy-50" : ""
                  }`}
                >
                  <span className="inline-flex items-center gap-1">
                    {c.label}
                    {c.sortable &&
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
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.map((o) => (
              <tr key={o.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="py-2.5 px-3 nums text-slate-400">{o.id}</td>
                <td className="py-2.5 px-3 font-medium text-slate-800">
                  <span className="line-clamp-2">{o.name}</span>
                </td>
                <td className="py-2.5 px-3 text-slate-600">{o.type}</td>
                <td className="py-2.5 px-3 text-slate-600">{o.department}</td>
                <td className="py-2.5 px-3 text-slate-600">{o.owner}</td>
                <td className="py-2.5 px-3">
                  <StatusBadge status={o.status} />
                </td>
                <td className="py-2.5 px-3">
                  <RiskBadge level={o.riskLevel} />
                </td>
                <td className="py-2.5 px-3 nums text-slate-700">{o.riskScore}</td>
                <td className="py-2.5 px-3 nums text-slate-600">{formatDate(o.startDate)}</td>
                <td className="py-2.5 px-3 nums text-slate-600">{formatDate(o.endDate)}</td>
                <td className="py-2.5 px-3 nums text-slate-600">{o.quarter}</td>
                <td className="py-2.5 px-3 nums text-slate-600">{o.plannedDuration}</td>
                <td className="py-2.5 px-3 nums text-slate-600">{o.actualDuration}</td>
                <td className="py-2.5 px-3 nums">
                  {o.delayDays > 0 ? (
                    <span className="text-red-600 font-bold">{o.delayDays}</span>
                  ) : (
                    <span className="text-slate-400">0</span>
                  )}
                </td>
                <td className="py-2.5 px-3 min-w-[120px]">
                  <ProgressBar value={o.completion} />
                </td>
                <td className="py-2.5 px-3">
                  <PhaseBadge phase={o.phase} />
                </td>
                <td className="py-2.5 px-3 nums text-slate-700">{o.findings}</td>
                <td className="py-2.5 px-3 nums text-slate-700">{o.criticalFindings}</td>
                <td className="py-2.5 px-3 nums text-slate-700">{o.totalRecs}</td>
                <td className="py-2.5 px-3 nums text-slate-700">{o.closedRecs}</td>
                <td className="py-2.5 px-3 min-w-[120px]">
                  <ProgressBar value={o.recClosureRate} color="#c9a94e" />
                </td>
                <td className="py-2.5 px-3 text-slate-500 max-w-[240px] whitespace-normal align-top" title={o.comments || undefined}>
                  <span className="line-clamp-2">{o.comments || "—"}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-3 text-sm">
        <span className="text-slate-500 nums">
          {sorted.length} عملية · صفحة {safePage + 1} من {pages}
        </span>
        {pages > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(0, safePage - 1))}
              disabled={safePage === 0}
              className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
            >
              <ChevronRight size={16} />
            </button>
            <button
              onClick={() => setPage(Math.min(pages - 1, safePage + 1))}
              disabled={safePage >= pages - 1}
              className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
            >
              <ChevronLeft size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
