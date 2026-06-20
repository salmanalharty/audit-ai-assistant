// قراءة ملف الإكسل مرة واحدة عند الإقلاع وتحويله إلى بيانات مهيكلة.
import * as XLSX from "xlsx";
import type {
  AuditOperation,
  AuditDataByYear,
  AuditYear,
  AuditType,
  AuditStatus,
  RiskLevel,
  Quarter,
  AuditPhase,
} from "../types/audit";
import { YEARS } from "../types/audit";
import type { FollowUpObservation, ObsStatus, FollowUpCategory } from "../types/followup";
import { excelSerialToDate } from "../utils/format";

const DATA_URL = "/data/Audit_Plan_v2.xlsx";

// تعيين رؤوس الأعمدة العربية إلى مفاتيح الكائن
function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const cleaned = v.replace("%", "").trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

// النِّسَب قد تأتي ككسر (0.7) أو كنسبة مئوية (70) — نوحّدها إلى كسر 0..1
function toFraction(v: unknown): number {
  const num = toNumber(v);
  return num > 1 ? num / 100 : num;
}

function parseRow(row: Record<string, unknown>, year: AuditYear): AuditOperation {
  return {
    id: toNumber(row["رقم العملية"]),
    name: String(row["اسم العملية"] ?? "").trim(),
    type: String(row["نوع المراجعة"] ?? "").trim() as AuditType,
    department: String(row["الإدارة تحت المراجعة"] ?? "").trim(),
    owner: String(row["المسؤول"] ?? "").trim(),
    status: String(row["الحالة"] ?? "").trim() as AuditStatus,
    riskLevel: String(row["مستوى الخطورة"] ?? "").trim() as RiskLevel,
    riskScore: toNumber(row["درجة المخاطر"]),
    startDate: excelSerialToDate(toNumber(row["تاريخ البداية"])),
    endDate: excelSerialToDate(toNumber(row["تاريخ النهاية"])),
    quarter: (String(row["الربع السنوي"] ?? "Q1").trim() as Quarter) || "Q1",
    plannedDuration: toNumber(row["مدة التنفيذ المخططة"]),
    actualDuration: toNumber(row["مدة التنفيذ الفعلية"]),
    delayDays: toNumber(row["عدد الأيام المتأخرة"]),
    completion: toFraction(row["نسبة الإنجاز"]),
    phase: (String(row["المرحلة"] ?? "تخطيط").trim() as AuditPhase) || "تخطيط",
    findings: toNumber(row["عدد الملاحظات"]),
    criticalFindings: toNumber(row["ملاحظات عالية الخطورة"]),
    totalRecs: toNumber(row["إجمالي التوصيات"]),
    closedRecs: toNumber(row["التوصيات المغلقة"]),
    recClosureRate: toFraction(row["نسبة إغلاق التوصيات"]),
    comments: String(row["تعليقات"] ?? "").trim(),
    year,
  };
}

function parseFollowUp(row: Record<string, unknown>): FollowUpObservation {
  return {
    obsId: String(row["معرّف الملاحظة"] ?? "").trim(),
    year: toNumber(row["السنة"]),
    operationNo: toNumber(row["رقم العملية"]),
    operationName: String(row["اسم العملية"] ?? "").trim(),
    auditType: String(row["نوع المراجعة"] ?? "").trim() as AuditType,
    department: String(row["الإدارة تحت المراجعة"] ?? "").trim(),
    title: String(row["عنوان الملاحظة"] ?? "").trim(),
    recommendation: String(row["التوصية"] ?? "").trim(),
    riskLevel: String(row["درجة الخطر"] ?? "").trim() as RiskLevel,
    plannedDate: String(row["تاريخ التنفيذ المخطط"] ?? "").trim(),
    status: String(row["حالة الملاحظة"] ?? "").trim() as ObsStatus,
    followUpCategory: String(row["تصنيف المتابعة"] ?? "").trim() as FollowUpCategory,
    progress: toFraction(row["نسبة التقدم في التنفيذ"]),
    deferralCount: toNumber(row["عدد مرات التأجيل"]),
    overdueDays: toNumber(row["عدد أيام التأخر عن الإغلاق"]),
    justification: String(row["مبررات عدم الإغلاق"] ?? "").trim(),
    newClosureDate: String(row["التاريخ الجديد للإغلاق"] ?? "").trim(),
  };
}

export interface AuditDataset {
  byYear: AuditDataByYear;
  followUp: FollowUpObservation[];
}

export async function loadAuditData(): Promise<AuditDataset> {
  const res = await fetch(DATA_URL);
  if (!res.ok) throw new Error(`تعذّر تحميل ملف البيانات (${res.status})`);
  const buffer = await res.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });

  const byYear = {} as AuditDataByYear;
  for (const year of YEARS) {
    const sheet = wb.Sheets[String(year)];
    if (!sheet) {
      byYear[year] = [];
      continue;
    }
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
    byYear[year] = rows
      .filter((r) => toNumber(r["رقم العملية"]) > 0)
      .map((r) => parseRow(r, year));
  }

  let followUp: FollowUpObservation[] = [];
  const fuSheet = wb.Sheets["تقرير المتابعة"];
  if (fuSheet) {
    const fuRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(fuSheet, { defval: "" });
    followUp = fuRows
      .filter((r) => String(r["معرّف الملاحظة"] ?? "").trim() !== "")
      .map(parseFollowUp);
  }

  return { byYear, followUp };
}
