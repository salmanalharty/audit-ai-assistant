// تحويل الملاحظة المستخرجة من PDF إلى ملاحظة متابعة كاملة.
//
// الملاحظة المستوردة تُعامَل كأي ملاحظة أخرى في دورة المتابعة، لكن معرّفها
// يحمل الحرف "I" ليبقى تمييزها عن ملاحظات الإكسل ممكناً دائماً.
import type { ExtractedObservation } from "../types/extraction";
import type { FollowUpObservation } from "../types/followup";
import { dateToQuarterLabel, quarterEndDate } from "./workflow";

const IMPORTED_ID = /-I\d+$/;

/** هل هذا المعرّف لملاحظة مستوردة؟ */
export function isImportedId(obsId: string): boolean {
  return IMPORTED_ID.test(obsId);
}

/** توحيد موعد الإغلاق إلى صيغة "Qx YYYY" المعتمدة في المنصة */
function normalizeDueDate(raw: string, today: Date): string {
  const s = raw.trim();
  if (/^Q[1-4]\s+\d{4}$/.test(s)) return s;

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (iso) {
    return dateToQuarterLabel(
      new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])))
    );
  }

  const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (slash) {
    return dateToQuarterLabel(
      new Date(Date.UTC(Number(slash[3]), Number(slash[2]) - 1, Number(slash[1])))
    );
  }

  // لم يُذكر موعد في التقرير — نضع الربع الحالي ليظهر في المتابعة فوراً
  return dateToQuarterLabel(today);
}

export function toFollowUpObservation(
  e: ExtractedObservation,
  opts: { year: number; reportTitle: string; seq: number; today: Date }
): FollowUpObservation {
  const year = opts.year > 0 ? opts.year : opts.today.getUTCFullYear();
  const plannedDate = normalizeDueDate(e.dueDate, opts.today);
  const due = quarterEndDate(plannedDate);
  const overdueDays = due
    ? Math.max(0, Math.round((opts.today.getTime() - due.getTime()) / 86400000))
    : 0;

  return {
    obsId: `OBS-${year}-I${String(opts.seq).padStart(3, "0")}`,
    year,
    operationNo: 0,
    operationName: opts.reportTitle || "تقرير مستورد",
    auditType: e.auditType,
    department: e.department || "غير محددة",
    title: e.title,
    recommendation: e.recommendation,
    riskLevel: e.riskLevel,
    plannedDate,
    status: "لم تغلق",
    followUpCategory: overdueDays > 0 ? "متأخرة" : "ضمن المهلة",
    progress: 0,
    deferralCount: 0,
    overdueDays,
    justification: "—",
    newClosureDate: "—",
    responsible: e.responsible || "غير محدد",
    email: e.email,
  };
}
