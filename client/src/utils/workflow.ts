// محرك قواعد متابعة الإجراءات التصحيحية — دوال نقية بلا أي ذكاء اصطناعي.
//
// لماذا بلا ذكاء اصطناعي؟ قرارات «مَن المستحق» و«مَن يُصعَّد» يجب أن تكون
// حتمية وقابلة للتدقيق وقابلة لإعادة الإنتاج بنفس النتيجة — وهي خصائص لا
// يوفّرها نموذج لغوي. الذكاء الاصطناعي يأتي لاحقاً لصياغة نص المراسلات فقط.
import type { FollowUpObservation } from "../types/followup";
import type { ActionRecord, ActionState } from "../types/actions";
import { UNJUSTIFIED } from "../types/followup";

// ===== عتبات القواعد (مُعلنة صراحةً ليسهل تدقيقها وتعديلها) =====

/** يُعتبر الإجراء «مستحقاً قريباً» إذا بقي على موعده هذا العدد من الأيام أو أقل */
export const DUE_SOON_DAYS = 90;

/** التأخر الذي يستوجب التصعيد (يوم) */
export const ESCALATION_OVERDUE_DAYS = 60;

/** عدد التمديدات الذي يُعدّ بعده التأجيل «مزمناً» */
export const CHRONIC_EXTENSIONS = 2;

/** نسبة التقدم التي يصبح عندها الإجراء جاهزاً للإغلاق */
export const READY_TO_CLOSE_PROGRESS = 0.95;

const QUARTER_END_MONTH_DAY: Record<string, [number, number]> = {
  Q1: [2, 31], // مارس 31
  Q2: [5, 30], // يونيو 30
  Q3: [8, 30], // سبتمبر 30
  Q4: [11, 31], // ديسمبر 31
};

/**
 * تحويل تسمية الربع إلى تاريخ استحقاق فعلي = آخر يوم في الربع.
 * "Q3 2025" → 2025-09-30. القيم غير الصالحة ("—"، فراغ) تعيد null.
 */
export function quarterEndDate(label: string): Date | null {
  const m = /^(Q[1-4])\s+(\d{4})$/.exec((label ?? "").trim());
  if (!m) return null;
  const [month, day] = QUARTER_END_MONTH_DAY[m[1]];
  return new Date(Date.UTC(Number(m[2]), month, day));
}

/** الربع الذي يقع فيه تاريخ ما — "Q4 2026" */
export function dateToQuarterLabel(d: Date): string {
  return `Q${Math.floor(d.getUTCMonth() / 3) + 1} ${d.getUTCFullYear()}`;
}

/**
 * نهاية الربع التالي لتاريخ معيّن — الموعد الافتراضي المقترح عند التمديد،
 * لأن مواعيد الإجراءات التصحيحية في خطة المراجعة تُدار بالأرباع لا بالأيام.
 */
export function nextQuarterEnd(from: Date): Date {
  const nextQ = Math.floor(from.getUTCMonth() / 3) + 1;
  const year = from.getUTCFullYear() + Math.floor(nextQ / 4);
  const [month, day] = QUARTER_END_MONTH_DAY[`Q${(nextQ % 4) + 1}`];
  return new Date(Date.UTC(year, month, day));
}

// ===== الدمج: الإكسل + سجل التجاوزات =====

export interface EffectiveAction {
  obs: FollowUpObservation;
  /** هل اتُّخذ أي إجراء داخل المنصة على هذه الملاحظة؟ */
  touched: boolean;
  state: ActionState;
  /** تاريخ الاستحقاق الحالي (بعد أي تمديد) */
  dueDate: Date | null;
  /** تاريخ الاستحقاق الأصلي من خطة المراجعة */
  originalDueDate: Date | null;
  /** إجمالي التأجيلات = تأجيلات الإكسل + التمديدات داخل المنصة */
  extensions: number;
  lastReminder: Date | null;
  closedAt: Date | null;
  escalatedAt: Date | null;
  /** الأيام المتبقية حتى الاستحقاق (سالب = متأخر، NaN = بلا تاريخ) */
  daysToDue: number;
  /** أيام التأخر — من الإكسل ما لم يُمدَّد التاريخ داخل المنصة */
  overdueDays: number;
  isOpen: boolean;
  isOverdue: boolean;
  isDueSoon: boolean;
  /** لم تُغلق وبلا مبرر مقبول */
  isUnjustified: boolean;
}

function baseState(obs: FollowUpObservation): ActionState {
  return obs.status === "مغلقة" ? "مغلقة" : "قيد التنفيذ";
}

/** تاريخ الاستحقاق المشتق من الإكسل: التاريخ الجديد إن وُجد، وإلا المخطط */
export function baselineDueDate(obs: FollowUpObservation): Date | null {
  return quarterEndDate(obs.newClosureDate) ?? quarterEndDate(obs.plannedDate);
}

/**
 * دمج ملاحظة مع سجل تجاوزاتها (إن وُجد) وحساب كل المشتقات.
 *
 * ملاحظة مهمة عن `overdueDays`: ما دام التاريخ لم يُمدَّد داخل المنصة نستخدم
 * قيمة الإكسل كما هي — حتى تبقى الأرقام مطابقة تماماً لصفحة «تقرير المتابعة».
 * بعد التمديد فقط نحسب التأخر من التاريخ الجديد مقابل اليوم.
 */
export function effectiveAction(
  obs: FollowUpObservation,
  rec: ActionRecord | undefined,
  today: Date
): EffectiveAction {
  const originalDueDate = baselineDueDate(obs);
  const overridden = rec?.dueDateISO ? new Date(rec.dueDateISO) : null;
  const dueDate = overridden ?? originalDueDate;

  const state = rec?.state ?? baseState(obs);
  const isOpen = state !== "مغلقة";

  const daysToDue = dueDate
    ? Math.round((dueDate.getTime() - today.getTime()) / 86400000)
    : NaN;

  let overdueDays: number;
  if (!isOpen) overdueDays = 0;
  else if (overridden) overdueDays = Math.max(0, -daysToDue);
  else overdueDays = obs.overdueDays;

  return {
    obs,
    touched: Boolean(rec),
    state,
    dueDate,
    originalDueDate,
    extensions: obs.deferralCount + (rec?.extensions ?? 0),
    lastReminder: rec?.lastReminderISO ? new Date(rec.lastReminderISO) : null,
    closedAt: rec?.closedAtISO ? new Date(rec.closedAtISO) : null,
    escalatedAt: rec?.escalatedAtISO ? new Date(rec.escalatedAtISO) : null,
    daysToDue,
    overdueDays,
    isOpen,
    isOverdue: isOpen && overdueDays > 0,
    isDueSoon:
      isOpen && overdueDays === 0 && daysToDue >= 0 && daysToDue <= DUE_SOON_DAYS,
    isUnjustified: isOpen && obs.justification.trim() === UNJUSTIFIED,
  };
}

/** دمج قائمة كاملة */
export function effectiveActions(
  obs: FollowUpObservation[],
  records: Record<string, ActionRecord>,
  today: Date
): EffectiveAction[] {
  return obs.map((o) => effectiveAction(o, records[o.obsId], today));
}

// ===== المؤشرات الحية =====

export interface WorkflowKpis {
  total: number;
  inProgress: number;
  closed: number;
  escalated: number;
  delayed: number;
  dueSoon: number;
  unjustified: number;
  closureRate: number; // 0..1
}

export function workflowKpis(list: EffectiveAction[]): WorkflowKpis {
  const total = list.length;
  let inProgress = 0;
  let closed = 0;
  let escalated = 0;
  let delayed = 0;
  let dueSoon = 0;
  let unjustified = 0;

  for (const a of list) {
    if (a.state === "مغلقة") closed++;
    else if (a.state === "مصعّدة") escalated++;
    else inProgress++;
    if (a.isOverdue) delayed++;
    if (a.isDueSoon) dueSoon++;
    if (a.isUnjustified) unjustified++;
  }

  return {
    total,
    inProgress,
    closed,
    escalated,
    delayed,
    dueSoon,
    unjustified,
    closureRate: total ? closed / total : 0,
  };
}

// ===== اقتراحات المحرك (حتمية ومُبرَّرة) =====

export type SuggestionKind = "تذكير" | "تصعيد" | "تمديد" | "إغلاق";

export interface Suggestion {
  kind: SuggestionKind;
  /** القاعدة التي أنتجت الاقتراح — تُعرض للمستخدم ليعرف "لماذا" */
  rule: string;
  obsIds: string[];
}

/**
 * تطبيق قواعد المتابعة على القائمة الحالية.
 * كل قاعدة مستقلة؛ قد تظهر الملاحظة في أكثر من اقتراح (مثلاً متأخرة ومزمنة).
 */
export function suggestions(list: EffectiveAction[]): Suggestion[] {
  const open = list.filter((a) => a.isOpen);

  const rules: { kind: SuggestionKind; rule: string; test: (a: EffectiveAction) => boolean }[] = [
    {
      kind: "تذكير",
      rule: `مستحقة خلال ${DUE_SOON_DAYS} يوماً ولم تتأخر بعد`,
      test: (a) => a.isDueSoon,
    },
    {
      kind: "تصعيد",
      rule: `متأخرة ${ESCALATION_OVERDUE_DAYS} يوماً فأكثر وبلا مبرر`,
      test: (a) =>
        a.state !== "مصعّدة" &&
        a.isUnjustified &&
        a.overdueDays >= ESCALATION_OVERDUE_DAYS,
    },
    {
      kind: "تصعيد",
      rule: "عالية الخطورة ومتأخرة عن موعد الإغلاق",
      test: (a) => a.state !== "مصعّدة" && a.isOverdue && a.obs.riskLevel === "عالي",
    },
    {
      kind: "تمديد",
      rule: `تأجيل مزمن (${CHRONIC_EXTENSIONS} مرات فأكثر) — يتطلب موافقة رسمية`,
      test: (a) => a.extensions >= CHRONIC_EXTENSIONS && a.isOverdue,
    },
    {
      kind: "إغلاق",
      rule: `نسبة التنفيذ ${Math.round(READY_TO_CLOSE_PROGRESS * 100)}% فأعلى — جاهزة للإغلاق`,
      test: (a) => a.obs.progress >= READY_TO_CLOSE_PROGRESS,
    },
  ];

  return rules
    .map(({ kind, rule, test }) => ({
      kind,
      rule,
      obsIds: open.filter(test).map((a) => a.obs.obsId),
    }))
    .filter((s) => s.obsIds.length > 0);
}
