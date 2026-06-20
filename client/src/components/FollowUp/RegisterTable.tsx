import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  Search,
} from "lucide-react";
import type { FollowUpObservation } from "../../types/followup";
import { RiskBadge, ObsStatusBadge, CategoryBadge } from "../common/Badge";
import { ProgressBar } from "../common/ProgressBar";
import { EmptyState } from "../common/EmptyState";
import { formatPercent } from "../../utils/format";

type Key = keyof FollowUpObservation;
const PER_PAGE = 15;

interface Col {
  key: Key;
  label: string;
}
const COLS: Col[] = [
  { key: "obsId", label: "معرّف الملاحظة" },
  { key: "year", label: "السنة" },
  { key: "operationNo", label: "رقم العملية" },
  { key: "operationName", label: "اسم العملية" },
  { key: "auditType", label: "النوع" },
  { key: "department", label: "الإدارة" },
  { key: "title", label: "عنوان الملاحظة" },
  { key: "recommendation", label: "التوصية" },
  { key: "riskLevel", label: "درجة الخطر" },
  { key: "plannedDate", label: "التنفيذ المخطط" },
  { key: "status", label: "الحالة" },
  { key: "followUpCategory", label: "تصنيف المتابعة" },
  { key: "progress", label: "نسبة التقدم" },
  { key: "deferralCount", label: "مرات التأجيل" },
  { key: "overdueDays", label: "أيام التأخر" },
  { key: "justification", label: "المبررات" },
  { key: "newClosureDate", label: "التاريخ الجديد" },
];

function exportExcel(obs: FollowUpObservation[]) {
  const rows = obs.map((o) => ({
    "معرّف الملاحظة": o.obsId,
    السنة: o.year,
    "رقم العملية": o.operationNo,
    "اسم العملية": o.operationName,
    "نوع المراجعة": o.auditType,
    الإدارة: o.department,
    "عنوان الملاحظة": o.title,
    التوصية: o.recommendation,
    "درجة الخطر": o.riskLevel,
    "تاريخ التنفيذ المخطط": o.plannedDate,
    "حالة الملاحظة": o.status,
    "تصنيف المتابعة": o.followUpCategory,
    "نسبة التقدم": formatPercent(o.progress),
    "عدد مرات التأجيل": o.deferralCount,
    "عدد أيام التأخر": o.overdueDays,
    المبررات: o.justification,
    "التاريخ الجديد للإغلاق": o.newClosureDate,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "تقرير المتابعة");
  XLSX.writeFile(wb, "تقرير_المتابعة.xlsx");
}

function exportPDF(obs: FollowUpObservation[]) {
  const body = obs
    .map(
      (o) => `<tr><td>${o.obsId}</td><td>${o.year}</td><td>${o.operationName}</td><td>${o.department}</td>
      <td>${o.title}</td><td>${o.riskLevel}</td><td>${o.status}</td><td>${o.followUpCategory}</td>
      <td>${o.overdueDays}</td><td>${o.justification}</td></tr>`
    )
    .join("");
  const html = `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>تقرير المتابعة</title>
  <style>body{font-family:'IBM Plex Sans Arabic',Arial,sans-serif;padding:24px;color:#1e293b}
  h1{color:#1f3864;font-size:18px}table{width:100%;border-collapse:collapse;font-size:10px}
  th,td{border:1px solid #cbd5e1;padding:4px 5px;text-align:right}th{background:#1f3864;color:#fff}
  tr:nth-child(even){background:#f1f5f9}</style></head><body>
  <h1>تقرير متابعة الملاحظات (${obs.length} ملاحظة)</h1>
  <table><thead><tr><th>المعرّف</th><th>السنة</th><th>العملية</th><th>الإدارة</th><th>العنوان</th>
  <th>الخطر</th><th>الحالة</th><th>التصنيف</th><th>أيام التأخر</th><th>المبررات</th></tr></thead>
  <tbody>${body}</tbody></table><script>window.onload=()=>window.print()</script></body></html>`;
  const w = window.open("", "_blank");
  if (!w) { alert("يرجى السماح بالنوافذ المنبثقة لتصدير PDF."); return; }
  w.document.write(html); w.document.close();
}

export function RegisterTable({ obs }: { obs: FollowUpObservation[] }) {
  const [sortKey, setSortKey] = useState<Key>("overdueDays");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState("");

  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return obs;
    return obs.filter((o) =>
      `${o.title} ${o.recommendation} ${o.operationName} ${o.department} ${o.justification}`
        .toLowerCase()
        .includes(q)
    );
  }, [obs, query]);

  const sorted = useMemo(() => {
    return [...searched].sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      let cmp = 0;
      if (typeof va === "number" && typeof vb === "number") cmp = va - vb;
      else cmp = String(va).localeCompare(String(vb), "ar");
      return dir === "asc" ? cmp : -cmp;
    });
  }, [searched, sortKey, dir]);

  const pages = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
  const safePage = Math.min(page, pages - 1);
  const slice = sorted.slice(safePage * PER_PAGE, safePage * PER_PAGE + PER_PAGE);

  function toggleSort(k: Key) {
    if (sortKey === k) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setDir("asc"); }
    setPage(0);
  }

  if (obs.length === 0) return <EmptyState message="لا توجد ملاحظات مطابقة للفلاتر" />;

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={16} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(0); }}
            placeholder="ابحث في العنوان، التوصية، العملية، الإدارة، المبرر…"
            className="w-full bg-white border border-slate-300 rounded-lg pr-9 pl-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30"
          />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => exportExcel(sorted)} className="flex items-center gap-1.5 text-sm bg-status-done text-white px-3 py-2 rounded-lg hover:brightness-95">
            <FileSpreadsheet size={16} /> تصدير Excel
          </button>
          <button onClick={() => exportPDF(sorted)} className="flex items-center gap-1.5 text-sm bg-navy text-white px-3 py-2 rounded-lg hover:bg-navy-700">
            <FileText size={16} /> تصدير PDF
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-sm whitespace-nowrap border-collapse [&_th]:border-l [&_th]:border-slate-200/60 [&_td]:border-l [&_td]:border-slate-100">
          <thead>
            <tr className="bg-navy-50 text-navy text-xs">
              {COLS.map((c) => (
                <th
                  key={c.key}
                  onClick={() => toggleSort(c.key)}
                  className={`text-right font-semibold py-2.5 px-3 cursor-pointer select-none border-b border-slate-200 hover:bg-navy-100/40 ${
                    c.key === "obsId" ? "sticky right-0 z-20 bg-navy-50 w-32" : ""
                  } ${c.key === "title" ? "sticky right-32 z-20 bg-navy-50" : ""}`}
                >
                  <span className="inline-flex items-center gap-1">
                    {c.label}
                    {sortKey === c.key ? (
                      dir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                    ) : (
                      <ArrowUpDown size={12} className="text-slate-300" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.map((o, idx) => (
              <tr key={o.obsId} className={idx % 2 ? "bg-slate-50/50" : "bg-white"}>
                <td className={`py-2.5 px-3 nums text-slate-500 border-b border-slate-100 sticky right-0 z-10 w-32 ${idx % 2 ? "bg-slate-50" : "bg-white"}`}>{o.obsId}</td>
                <td className="py-2.5 px-3 nums text-center text-slate-600 border-b border-slate-100">{o.year}</td>
                <td className="py-2.5 px-3 nums text-center text-slate-500 border-b border-slate-100">{o.operationNo}</td>
                <td className="py-2.5 px-3 text-slate-700 border-b border-slate-100">{o.operationName}</td>
                <td className="py-2.5 px-3 text-slate-600 border-b border-slate-100">{o.auditType}</td>
                <td className="py-2.5 px-3 text-slate-600 border-b border-slate-100">{o.department}</td>
                <td className={`py-2.5 px-3 font-medium text-slate-800 border-b border-slate-100 max-w-[240px] whitespace-normal align-top sticky right-32 z-10 ${idx % 2 ? "bg-slate-50" : "bg-white"}`}>
                  <span className="line-clamp-2" title={o.title}>{o.title}</span>
                </td>
                <td className="py-2.5 px-3 text-slate-500 border-b border-slate-100 max-w-[240px] whitespace-normal align-top">
                  <span className="line-clamp-2" title={o.recommendation}>{o.recommendation}</span>
                </td>
                <td className="py-2.5 px-3 text-center border-b border-slate-100"><RiskBadge level={o.riskLevel} /></td>
                <td className="py-2.5 px-3 nums text-center text-slate-600 border-b border-slate-100">{o.plannedDate}</td>
                <td className="py-2.5 px-3 text-center border-b border-slate-100"><ObsStatusBadge status={o.status} /></td>
                <td className="py-2.5 px-3 text-center border-b border-slate-100"><CategoryBadge category={o.followUpCategory} /></td>
                <td className="py-2.5 px-3 border-b border-slate-100 min-w-[120px]"><ProgressBar value={o.progress} /></td>
                <td className="py-2.5 px-3 nums text-center text-slate-600 border-b border-slate-100">{o.deferralCount}</td>
                <td className="py-2.5 px-3 nums text-center border-b border-slate-100">
                  {o.overdueDays > 0 ? <span className="text-red-600 font-bold">{o.overdueDays}</span> : <span className="text-slate-400">0</span>}
                </td>
                <td className="py-2.5 px-3 text-slate-500 border-b border-slate-100 max-w-[200px] whitespace-normal align-top">
                  <span className="line-clamp-2" title={o.justification}>{o.justification}</span>
                </td>
                <td className="py-2.5 px-3 nums text-center text-slate-600 border-b border-slate-100">{o.newClosureDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-3 text-sm">
        <span className="text-slate-500 nums">{sorted.length} ملاحظة · صفحة {safePage + 1} من {pages}</span>
        {pages > 1 && (
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(Math.max(0, safePage - 1))} disabled={safePage === 0} className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50">
              <ChevronRight size={16} />
            </button>
            <button onClick={() => setPage(Math.min(pages - 1, safePage + 1))} disabled={safePage >= pages - 1} className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50">
              <ChevronLeft size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
