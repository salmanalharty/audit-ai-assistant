// أنواع البيانات الأساسية لخطة المراجعة الداخلية
// الأسماء بالإنجليزية في الكود، والعرض بالعربية في الواجهة.

export type AuditType = "تقنية معلومات" | "مالية" | "مؤسسية";

export type AuditStatus =
  | "مكتملة"
  | "تحت التنفيذ"
  | "متأخرة"
  | "لم تبدأ"
  | "مؤجلة";

export type RiskLevel = "عالي" | "متوسط" | "منخفض";

export type Quarter = "Q1" | "Q2" | "Q3" | "Q4";

export type AuditPhase = "تخطيط" | "عمل ميداني" | "تقرير";

export type AuditYear = 2022 | 2023 | 2024 | 2025 | 2026;

/** عملية مراجعة واحدة (صف في الإكسل = 18 عمود) */
export interface AuditOperation {
  id: number; // رقم العملية
  name: string; // اسم العملية
  type: AuditType; // نوع المراجعة
  department: string; // الإدارة تحت المراجعة
  owner: string; // المسؤول
  status: AuditStatus; // الحالة
  riskLevel: RiskLevel; // مستوى الخطورة
  riskScore: number; // درجة المخاطر 1–100
  startDate: Date | null; // تاريخ البداية
  endDate: Date | null; // تاريخ النهاية
  quarter: Quarter; // الربع السنوي (من تاريخ البداية)
  plannedDuration: number; // مدة التنفيذ المخططة (أيام، مُدخلة)
  actualDuration: number; // مدة التنفيذ الفعلية (النهاية − البداية)
  delayDays: number; // عدد الأيام المتأخرة = MAX(0, الفعلية − المخططة)
  completion: number; // نسبة الإنجاز 0..1
  phase: AuditPhase; // المرحلة (من نسبة الإنجاز)
  findings: number; // عدد الملاحظات
  criticalFindings: number; // ملاحظات عالية الخطورة
  totalRecs: number; // إجمالي التوصيات
  closedRecs: number; // التوصيات المغلقة
  recClosureRate: number; // نسبة إغلاق التوصيات 0..1
  comments: string; // تعليقات
  year: AuditYear; // السنة (مشتقة من اسم الشيت)
}

export type AuditDataByYear = Record<AuditYear, AuditOperation[]>;

export const YEARS: AuditYear[] = [2022, 2023, 2024, 2025, 2026];

export const QUARTERS: Quarter[] = ["Q1", "Q2", "Q3", "Q4"];

export const PHASES: AuditPhase[] = ["تخطيط", "عمل ميداني", "تقرير"];

export const AUDIT_TYPES: AuditType[] = [
  "تقنية معلومات",
  "مالية",
  "مؤسسية",
];

export const AUDIT_STATUSES: AuditStatus[] = [
  "مكتملة",
  "تحت التنفيذ",
  "متأخرة",
  "لم تبدأ",
  "مؤجلة",
];

export const RISK_LEVELS: RiskLevel[] = ["عالي", "متوسط", "منخفض"];
