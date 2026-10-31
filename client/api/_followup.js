// قراءة سجل المتابعة من ملف الإكسل المنشور مع الموقع — للاستخدام في المشغّل
// اليومي، لأن الخادم لا يملك البيانات التي يقرأها المتصفح.
import * as XLSX from "xlsx";

const SHEET = "تقرير المتابعة";
const DATA_PATH = "/data/Audit_Plan_v2.xlsx";

const QUARTER_END = { Q1: [2, 31], Q2: [5, 30], Q3: [8, 30], Q4: [11, 31] };

/** نهاية الربع من وسم "Qx YYYY" — نفس منطق utils/workflow.ts في الواجهة */
export function quarterEndDate(label) {
  const m = /^(Q[1-4])\s+(\d{4})$/.exec(String(label ?? "").trim());
  if (!m) return null;
  const [month, day] = QUARTER_END[m[1]];
  return new Date(Date.UTC(Number(m[2]), month, day));
}

function baseUrl() {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  return host ? `https://${host}` : "http://localhost:5173";
}

/** تحميل الملاحظات غير المغلقة من ملف الإكسل المنشور */
export async function loadFollowUp() {
  const res = await fetch(`${baseUrl()}${DATA_PATH}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`تعذّر تحميل ملف البيانات (${res.status}).`);

  const wb = XLSX.read(new Uint8Array(await res.arrayBuffer()), { type: "array" });
  const sheet = wb.Sheets[SHEET];
  if (!sheet) throw new Error(`الشيت «${SHEET}» غير موجود في ملف البيانات.`);

  return XLSX.utils
    .sheet_to_json(sheet, { defval: "" })
    .filter((r) => String(r["معرّف الملاحظة"] ?? "").trim() !== "")
    .map((r) => ({
      obsId: String(r["معرّف الملاحظة"]).trim(),
      title: String(r["عنوان الملاحظة"] ?? "").trim(),
      recommendation: String(r["التوصية"] ?? "").trim(),
      riskLevel: String(r["درجة الخطر"] ?? "").trim(),
      department: String(r["الإدارة تحت المراجعة"] ?? "").trim(),
      responsible: String(r["المسؤول عن التنفيذ"] ?? "").trim(),
      email: String(r["البريد الإلكتروني"] ?? "").trim(),
      plannedDate: String(r["تاريخ التنفيذ المخطط"] ?? "").trim(),
      status: String(r["حالة الملاحظة"] ?? "").trim(),
    }));
}
