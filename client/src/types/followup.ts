// أنواع تقرير المتابعة (Follow-up Report)
import type { AuditType, RiskLevel } from "./audit";

export type ObsStatus = "مغلقة" | "لم تغلق";

export type FollowUpCategory =
  | "مغلقة في الموعد"
  | "مغلقة بعد تأجيل"
  | "ضمن المهلة"
  | "مؤجلة"
  | "متأخرة";

export interface FollowUpObservation {
  obsId: string; // معرّف الملاحظة OBS-سنة-تسلسل
  year: number; // السنة
  operationNo: number; // رقم العملية
  operationName: string; // اسم العملية
  auditType: AuditType; // نوع المراجعة
  department: string; // الإدارة
  title: string; // عنوان الملاحظة
  recommendation: string; // التوصية
  riskLevel: RiskLevel; // درجة الخطر
  plannedDate: string; // تاريخ التنفيذ المخطط "Qx YYYY"
  status: ObsStatus; // حالة الملاحظة
  followUpCategory: FollowUpCategory; // تصنيف المتابعة
  progress: number; // نسبة التقدم 0..1
  deferralCount: number; // عدد مرات التأجيل
  overdueDays: number; // عدد أيام التأخر
  justification: string; // مبررات عدم الإغلاق (أو "غير مبرر" / "—")
  newClosureDate: string; // التاريخ الجديد للإغلاق "Qx YYYY" أو "—"
}

export const OBS_STATUSES: ObsStatus[] = ["مغلقة", "لم تغلق"];

export const FOLLOWUP_CATEGORIES: FollowUpCategory[] = [
  "مغلقة في الموعد",
  "مغلقة بعد تأجيل",
  "ضمن المهلة",
  "مؤجلة",
  "متأخرة",
];

export const UNJUSTIFIED = "غير مبرر";
