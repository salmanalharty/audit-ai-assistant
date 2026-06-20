// تصدير البيانات المفلترة: Excel عبر SheetJS، وPDF عبر طباعة المتصفح (آمن للعربية RTL).
import * as XLSX from "xlsx";
import type { AuditOperation } from "../types/audit";
import { formatDate, formatPercent } from "./format";

function toRow(o: AuditOperation) {
  return {
    "رقم العملية": o.id,
    "اسم العملية": o.name,
    "نوع المراجعة": o.type,
    "الإدارة تحت المراجعة": o.department,
    المسؤول: o.owner,
    الحالة: o.status,
    "مستوى الخطورة": o.riskLevel,
    "درجة المخاطر": o.riskScore,
    "تاريخ البداية": formatDate(o.startDate),
    "تاريخ النهاية": formatDate(o.endDate),
    "الربع السنوي": o.quarter,
    "مدة التنفيذ المخططة": o.plannedDuration,
    "مدة التنفيذ الفعلية": o.actualDuration,
    "عدد الأيام المتأخرة": o.delayDays,
    "نسبة الإنجاز": formatPercent(o.completion),
    المرحلة: o.phase,
    "عدد الملاحظات": o.findings,
    "ملاحظات عالية الخطورة": o.criticalFindings,
    "إجمالي التوصيات": o.totalRecs,
    "التوصيات المغلقة": o.closedRecs,
    "نسبة إغلاق التوصيات": formatPercent(o.recClosureRate),
    تعليقات: o.comments,
  };
}

export function exportToExcel(ops: AuditOperation[], year: number) {
  const ws = XLSX.utils.json_to_sheet(ops.map(toRow));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, String(year));
  XLSX.writeFile(wb, `خطة_المراجعة_${year}.xlsx`);
}

/** تقرير PDF عبر نافذة طباعة (المتصفح يحوّلها إلى PDF بدعم عربي كامل) */
export function exportToPDF(ops: AuditOperation[], year: number) {
  const rows = ops
    .map(
      (o) => `<tr>
      <td>${o.id}</td><td>${o.name}</td><td>${o.type}</td><td>${o.department}</td>
      <td>${o.owner}</td><td>${o.status}</td><td>${o.phase}</td><td>${o.riskScore}</td>
      <td>${o.quarter}</td><td>${formatPercent(o.completion)}</td>
      <td>${o.delayDays}</td><td>${formatPercent(o.recClosureRate)}</td>
    </tr>`
    )
    .join("");

  const html = `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
  <title>تقرير خطة المراجعة ${year}</title>
  <style>
    body{font-family:'IBM Plex Sans Arabic',Arial,sans-serif;padding:24px;color:#1e293b}
    h1{color:#1f3864;font-size:20px;margin-bottom:4px}
    .sub{color:#64748b;font-size:12px;margin-bottom:16px}
    table{width:100%;border-collapse:collapse;font-size:11px}
    th,td{border:1px solid #cbd5e1;padding:5px 6px;text-align:right}
    th{background:#1f3864;color:#fff}
    tr:nth-child(even){background:#f1f5f9}
  </style></head><body>
    <h1>تقرير خطة المراجعة الداخلية — ${year}</h1>
    <div class="sub">عدد العمليات: ${ops.length} · تاريخ التقرير: ${formatDate(new Date())}</div>
    <table><thead><tr>
      <th>#</th><th>العملية</th><th>النوع</th><th>الإدارة</th><th>المسؤول</th>
      <th>الحالة</th><th>المرحلة</th><th>درجة المخاطر</th><th>الربع</th><th>الإنجاز</th>
      <th>أيام التأخير</th><th>إغلاق التوصيات</th>
    </tr></thead><tbody>${rows}</tbody></table>
    <script>window.onload=function(){window.print();}</script>
  </body></html>`;

  const w = window.open("", "_blank");
  if (!w) {
    alert("يرجى السماح بالنوافذ المنبثقة لتصدير PDF.");
    return;
  }
  w.document.write(html);
  w.document.close();
}
