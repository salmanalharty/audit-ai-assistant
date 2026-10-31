// أنواع طبقة الإجراءات التصحيحية (Corrective Actions).
//
// مبدأ التصميم: ملف الإكسل يبقى **مصدر الحقيقة** ولا يُعدَّل. هذه الطبقة
// تخزّن "فروقات" فقط (overrides) لكل ملاحظة اتُّخذ عليها إجراء، وتُدمج فوق
// بيانات الإكسل وقت القراءة. الملاحظة التي لم يُتَّخذ عليها إجراء لا سجل لها.

import type { FollowUpObservation } from "./followup";

/** حالة الإجراء التصحيحي — مطابقة لدورة العمل (قيد التنفيذ ← مغلقة/مصعّدة) */
export type ActionState = "قيد التنفيذ" | "مغلقة" | "مصعّدة";

export const ACTION_STATES: ActionState[] = ["قيد التنفيذ", "مغلقة", "مصعّدة"];

/** نوع الحدث في سجل التدقيق */
export type ActionEventType =
  | "تذكير"
  | "تمديد"
  | "تصعيد"
  | "إغلاق"
  | "إعادة فتح"
  | "استيراد"
  | "فحص أدلة";

export const ACTION_EVENT_TYPES: ActionEventType[] = [
  "تذكير",
  "تمديد",
  "تصعيد",
  "إغلاق",
  "إعادة فتح",
  "استيراد",
  "فحص أدلة",
];

/**
 * الإجراءات التي يطلبها المستخدم من شريط الأزرار.
 * «استيراد» و«فحص أدلة» ليسا منها: الأول ينشأ من رفع تقرير، والثاني من رفع
 * دليل على ملاحظة بعينها — لا من تحديد صفوف ثم الضغط على زر.
 */
export type ActionKind = Exclude<ActionEventType, "استيراد" | "فحص أدلة">;

export const ACTION_KINDS: ActionKind[] = [
  "تذكير",
  "تمديد",
  "تصعيد",
  "إغلاق",
  "إعادة فتح",
];

/**
 * سجل التجاوزات لملاحظة واحدة. كل الحقول اختيارية عدا المعرّف وزمن التحديث:
 * الحقل غير المعرّف يعني "خُذ القيمة من الإكسل".
 */
export interface ActionRecord {
  obsId: string;
  state?: ActionState;
  /** تاريخ الاستحقاق بعد التمديد (ISO) — يتجاوز المشتق من "Qx YYYY" */
  dueDateISO?: string;
  /** عدد مرات التمديد داخل المنصة (يُضاف إلى تأجيلات الإكسل) */
  extensions?: number;
  lastReminderISO?: string;
  closedAtISO?: string;
  escalatedAtISO?: string;
  updatedISO: string;
}

/** حدث واحد في سجل التدقيق — غير قابل للتعديل بعد إنشائه */
export interface ActionEvent {
  id: string;
  obsId: string;
  type: ActionEventType;
  atISO: string;
  actor: string;
  /** وصف مقروء لأثر الحدث، مثل: «تمديد حتى 31/03/2027» */
  note: string;
}

/** الصورة الكاملة المحفوظة في المستودع */
export interface ActionsSnapshot {
  version: number;
  records: Record<string, ActionRecord>;
  events: ActionEvent[];
  /** ملاحظات مستخرجة من تقارير PDF — ليست في ملف الإكسل */
  imported: FollowUpObservation[];
}

/** v1 → v2: أُضيف حقل `imported` (الترحيل في actionsRepo) */
export const SNAPSHOT_VERSION = 2;

export const EMPTY_SNAPSHOT: ActionsSnapshot = {
  version: SNAPSHOT_VERSION,
  records: {},
  events: [],
  imported: [],
};
