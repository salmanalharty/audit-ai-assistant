// إعدادات المؤشرات القابلة للمقارنة على مستوى العملية الواحدة.
import type { AuditOperation } from "../types/audit";

export interface OpMetric {
  key: "riskScore" | "completion" | "findings" | "criticalFindings" | "recClosureRate" | "actualDuration";
  label: string;
  isPercent?: boolean;
  goodWhenUp: boolean; // هل الزيادة تُعدّ تحسّناً؟
}

export const OP_METRICS: OpMetric[] = [
  { key: "riskScore", label: "درجة المخاطر", goodWhenUp: false },
  { key: "completion", label: "نسبة الإنجاز", isPercent: true, goodWhenUp: true },
  { key: "findings", label: "عدد الملاحظات", goodWhenUp: false },
  { key: "criticalFindings", label: "الملاحظات الحرجة", goodWhenUp: false },
  { key: "recClosureRate", label: "نسبة إغلاق التوصيات", isPercent: true, goodWhenUp: true },
  { key: "actualDuration", label: "مدة التنفيذ الفعلية", goodWhenUp: false },
];

export function metricValue(o: AuditOperation, m: OpMetric): number {
  return o[m.key] as number;
}

/** نص منسّق لقيمة مؤشر */
export function fmtMetric(v: number, m: OpMetric): string {
  return m.isPercent ? `${Math.round(v * 100)}%` : String(v);
}

/** قيمة رقمية مناسبة للرسم (النِّسَب كـ 0–100) */
export function chartValue(v: number, m: OpMetric): number {
  return m.isPercent ? Math.round(v * 100) : v;
}
