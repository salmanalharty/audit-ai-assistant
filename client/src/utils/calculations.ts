// كل الحسابات النقية: مؤشرات KPI + منطق CAATs.
// دوال بلا حالة، قابلة لإعادة الاستخدام في كل الصفحات والمساعد الذكي.
import type {
  AuditOperation,
  AuditStatus,
  AuditType,
  AuditDataByYear,
  AuditYear,
  Quarter,
  AuditPhase,
} from "../types/audit";
import {
  AUDIT_STATUSES,
  AUDIT_TYPES,
  YEARS,
  QUARTERS,
  PHASES,
} from "../types/audit";
import { daysUntil, daysBetween } from "./format";

/** متوسط نسبة الإنجاز (0..1) */
export function overallCompletion(ops: AuditOperation[]): number {
  if (ops.length === 0) return 0;
  const sum = ops.reduce((acc, o) => acc + (o.completion || 0), 0);
  return sum / ops.length;
}

/** عدّ العمليات حسب الحالة */
export function countByStatus(ops: AuditOperation[]): Record<AuditStatus, number> {
  const result = Object.fromEntries(
    AUDIT_STATUSES.map((s) => [s, 0])
  ) as Record<AuditStatus, number>;
  for (const o of ops) result[o.status] = (result[o.status] || 0) + 1;
  return result;
}

/** عدّ العمليات حسب النوع */
export function countByType(ops: AuditOperation[]): Record<AuditType, number> {
  const result = Object.fromEntries(
    AUDIT_TYPES.map((t) => [t, 0])
  ) as Record<AuditType, number>;
  for (const o of ops) result[o.type] = (result[o.type] || 0) + 1;
  return result;
}

export interface KpiSummary {
  total: number;
  completed: number;
  inProgress: number;
  late: number;
  notStarted: number;
  postponed: number;
  overall: number; // نسبة الإنجاز الإجمالية 0..1
}

export function kpiSummary(ops: AuditOperation[]): KpiSummary {
  const byStatus = countByStatus(ops);
  return {
    total: ops.length,
    completed: byStatus["مكتملة"],
    inProgress: byStatus["تحت التنفيذ"],
    late: byStatus["متأخرة"],
    notStarted: byStatus["لم تبدأ"],
    postponed: byStatus["مؤجلة"],
    overall: overallCompletion(ops),
  };
}

/** نسبة من الإجمالي بصيغة كسر آمنة */
export function ratio(part: number, total: number): number {
  return total > 0 ? part / total : 0;
}

/** عدّ العمليات حسب المرحلة */
export function countByPhase(ops: AuditOperation[]): Record<AuditPhase, number> {
  const r = Object.fromEntries(PHASES.map((p) => [p, 0])) as Record<AuditPhase, number>;
  for (const o of ops) r[o.phase] = (r[o.phase] || 0) + 1;
  return r;
}

/** عدّ العمليات حسب الربع السنوي */
export function countByQuarter(ops: AuditOperation[]): Record<Quarter, number> {
  const r = Object.fromEntries(QUARTERS.map((q) => [q, 0])) as Record<Quarter, number>;
  for (const o of ops) r[o.quarter] = (r[o.quarter] || 0) + 1;
  return r;
}

/** العمليات المتأخرة فعلياً (عدد أيام التأخير > 0)، بما فيها المكتملة المتأخرة */
export function lateOps(ops: AuditOperation[]): AuditOperation[] {
  return ops.filter((o) => o.delayDays > 0);
}

/** ملخص العمليات التي اكتملت متأخرة */
export function completedLateSummary(ops: AuditOperation[]): {
  count: number;
  avgDelay: number;
} {
  const list = ops.filter((o) => o.status === "مكتملة" && o.delayDays > 0);
  const avg =
    list.length > 0 ? list.reduce((a, o) => a + o.delayDays, 0) / list.length : 0;
  return { count: list.length, avgDelay: Math.round(avg) };
}

/** تحليل التأخير: كل عملية بعدد أيام تأخيرها (>0) مرتّبة تنازلياً */
export function delayAnalysis(ops: AuditOperation[]): AuditOperation[] {
  return ops.filter((o) => o.delayDays > 0).sort((a, b) => b.delayDays - a.delayDays);
}

/** توزيع المراحل عبر السنوات (لرسم Stacked Bar) */
export interface PhaseYearPoint {
  year: AuditYear;
  تخطيط: number;
  "عمل ميداني": number;
  تقرير: number;
}
export function phaseByYear(data: AuditDataByYear): PhaseYearPoint[] {
  return YEARS.map((year) => {
    const c = countByPhase(data[year] || []);
    return { year, تخطيط: c["تخطيط"], "عمل ميداني": c["عمل ميداني"], تقرير: c["تقرير"] };
  });
}

// ===== التنبيهات الذكية =====
export interface SmartAlert {
  id: string;
  kind: "late" | "notStarted" | "dueSoon" | "topRisk" | "completedLate";
  title: string;
  count: number;
  ops: AuditOperation[];
}

export function smartAlerts(ops: AuditOperation[], today = new Date()): SmartAlert[] {
  const late = ops.filter((o) => o.status === "متأخرة");
  const notStarted = ops.filter((o) => o.status === "لم تبدأ");
  const dueSoon = ops.filter((o) => {
    if (o.status === "مكتملة") return false;
    const d = daysUntil(o.endDate, today);
    return !isNaN(d) && d >= 0 && d <= 30;
  });
  const topRisk = [...ops]
    .filter((o) => o.status !== "مكتملة")
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 3);
  const completedLateList = ops.filter((o) => o.status === "مكتملة" && o.delayDays > 0);
  const avgLate =
    completedLateList.length > 0
      ? Math.round(
          completedLateList.reduce((a, o) => a + o.delayDays, 0) / completedLateList.length
        )
      : 0;

  return [
    {
      id: "late",
      kind: "late",
      title: `${late.length} عمليات متأخرة عن موعدها`,
      count: late.length,
      ops: late,
    },
    {
      id: "notStarted",
      kind: "notStarted",
      title: `${notStarted.length} عمليات لم تبدأ حتى الآن`,
      count: notStarted.length,
      ops: notStarted,
    },
    {
      id: "dueSoon",
      kind: "dueSoon",
      title: `${dueSoon.length} عمليات تنتهي خلال 30 يوماً`,
      count: dueSoon.length,
      ops: dueSoon,
    },
    {
      id: "topRisk",
      kind: "topRisk",
      title: `أعلى ${topRisk.length} عمليات خطورة لم تكتمل بعد`,
      count: topRisk.length,
      ops: topRisk,
    },
    {
      id: "completedLate",
      kind: "completedLate",
      title: `${completedLateList.length} عمليات اكتملت متأخرة بمعدل ${avgLate} يوم تأخير`,
      count: completedLateList.length,
      ops: completedLateList,
    },
  ];
}

// ===== CAATs (أ) اتجاه الملاحظات عبر السنوات =====
export interface TrendPoint {
  year: AuditYear;
  totalFindings: number;
  criticalFindings: number;
}

export function findingsTrend(data: AuditDataByYear): TrendPoint[] {
  return YEARS.map((year) => {
    const ops = data[year] || [];
    return {
      year,
      totalFindings: ops.reduce((a, o) => a + o.findings, 0),
      criticalFindings: ops.reduce((a, o) => a + o.criticalFindings, 0),
    };
  });
}

// ===== CAATs (ب) تحليل الأعمار والتأخير =====
export interface AgingRow {
  op: AuditOperation;
  delayDays: number;
}

export function agingAnalysis(ops: AuditOperation[], today = new Date()): AgingRow[] {
  const currentYear = today.getFullYear();
  const rows: AgingRow[] = [];
  for (const o of ops) {
    // استبعاد ما لم يبدأ والمؤجل تماماً
    if (o.status === "لم تبدأ" || o.status === "مؤجلة") continue;
    // الأساس: عمود "عدد الأيام المتأخرة" (الفعلي − المخطط) — قيمة سليمة لا ضخمة
    let delay = o.delayDays;
    // للعمليات غير المكتملة في السنة الجارية فقط: احسب التأخر الحي منذ تاريخ النهاية
    if (o.status !== "مكتملة" && o.endDate && o.year === currentYear) {
      const since = daysBetween(o.endDate, today); // اليوم − تاريخ النهاية
      if (since > 0) delay = Math.max(delay, since);
    }
    if (delay > 0) rows.push({ op: o, delayDays: delay });
  }
  return rows.sort((a, b) => b.delayDays - a.delayDays);
}

// ===== CAATs (ج) متابعة التوصيات حسب الإدارة =====
export interface DeptClosure {
  department: string;
  totalRecs: number;
  closedRecs: number;
  rate: number; // 0..1
}

export function recClosureByDept(ops: AuditOperation[]): DeptClosure[] {
  const map = new Map<string, { total: number; closed: number }>();
  for (const o of ops) {
    const cur = map.get(o.department) || { total: 0, closed: 0 };
    cur.total += o.totalRecs;
    cur.closed += o.closedRecs;
    map.set(o.department, cur);
  }
  return Array.from(map.entries())
    .map(([department, v]) => ({
      department,
      totalRecs: v.total,
      closedRecs: v.closed,
      rate: ratio(v.closed, v.total),
    }))
    .sort((a, b) => a.rate - b.rate);
}

// ===== CAATs (د) كاشف الشذوذ =====
export interface Anomaly {
  op: AuditOperation;
  type: string;
  description: string;
}

export function detectAnomalies(ops: AuditOperation[]): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const avgDuration =
    ops.length > 0
      ? ops.reduce((a, o) => a + (o.actualDuration || 0), 0) / ops.length
      : 0;

  for (const o of ops) {
    if (o.status === "مكتملة" && o.findings === 0) {
      anomalies.push({
        op: o,
        type: "مكتملة بلا ملاحظات",
        description: "عملية مكتملة لكن عدد ملاحظاتها = 0 — هل تمت المراجعة فعلاً؟",
      });
    }
    if (o.completion > 0.8 && o.status === "متأخرة") {
      anomalies.push({
        op: o,
        type: "تناقض في الحالة",
        description: `نسبة الإنجاز ${(o.completion * 100).toFixed(0)}% لكن الحالة "متأخرة".`,
      });
    }
    if (o.riskScore > 75 && o.criticalFindings === 0 && o.status === "مكتملة") {
      anomalies.push({
        op: o,
        type: "مخاطر عالية بلا ملاحظات حرجة",
        description: `درجة المخاطر ${o.riskScore} مرتفعة لكن الملاحظات الحرجة = 0.`,
      });
    }
    if (avgDuration > 0 && o.actualDuration > avgDuration * 1.5) {
      anomalies.push({
        op: o,
        type: "مدة تنفيذ غير اعتيادية",
        description: `المدة الفعلية ${o.actualDuration} يوماً تتجاوز 1.5× المتوسط (${avgDuration.toFixed(0)} يوماً).`,
      });
    }
  }
  return anomalies;
}

// ===== CAATs (هـ) تغطية مجتمع المراجعة =====
export type CoverageCell = "completed" | "inProgress" | "notReviewed";

export interface CoverageMatrix {
  departments: string[]; // مرتّبة تصاعدياً حسب نسبة التغطية (الأقل أولاً)
  cells: Record<string, Record<AuditYear, CoverageCell>>;
  coverage: Record<string, number>; // نسبة التغطية 0..1 لكل إدارة
  summary: { covered: number; total: number }; // إدارات رُوجعت مرة واحدة على الأقل
}

export function coverageMatrix(data: AuditDataByYear): CoverageMatrix {
  const deptSet = new Set<string>();
  for (const year of YEARS) for (const o of data[year] || []) deptSet.add(o.department);
  const departments = Array.from(deptSet);

  const cells: CoverageMatrix["cells"] = {};
  const coverage: Record<string, number> = {};
  for (const dept of departments) {
    cells[dept] = Object.fromEntries(
      YEARS.map((y) => [y, "notReviewed"])
    ) as Record<AuditYear, CoverageCell>;
    let reviewedYears = 0;
    for (const year of YEARS) {
      const ops = (data[year] || []).filter((o) => o.department === dept);
      let cell: CoverageCell = "notReviewed";
      if (ops.some((o) => o.status === "مكتملة")) cell = "completed";
      else if (ops.some((o) => o.status === "تحت التنفيذ" || o.status === "متأخرة"))
        cell = "inProgress";
      // لم تبدأ / مؤجلة / لا عملية → notReviewed
      cells[dept][year] = cell;
      if (cell !== "notReviewed") reviewedYears++;
    }
    coverage[dept] = reviewedYears / YEARS.length;
  }

  // ترتيب تصاعدي حسب التغطية (الأقل أولاً لإبراز الفجوات)
  const sorted = [...departments].sort((a, b) => coverage[a] - coverage[b]);
  const covered = departments.filter((d) => coverage[d] > 0).length;
  return { departments: sorted, cells, coverage, summary: { covered, total: departments.length } };
}

// ===== اتجاه 5 سنوات + تنبؤ =====
export type TrendMetricKey =
  | "totalFindings"
  | "criticalFindings"
  | "avgRisk"
  | "avgCompletion"
  | "avgClosure";

export interface TrendMetric {
  key: TrendMetricKey;
  label: string;
  isPercent?: boolean;
}

export const TREND_METRICS: TrendMetric[] = [
  { key: "totalFindings", label: "إجمالي الملاحظات" },
  { key: "criticalFindings", label: "الملاحظات الحرجة" },
  { key: "avgRisk", label: "متوسط درجة المخاطر" },
  { key: "avgCompletion", label: "متوسط نسبة الإنجاز", isPercent: true },
  { key: "avgClosure", label: "متوسط نسبة إغلاق التوصيات", isPercent: true },
];

function mean(arr: number[]): number {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

export function aggregateMetric(ops: AuditOperation[], key: TrendMetricKey): number {
  switch (key) {
    case "totalFindings":
      return ops.reduce((a, o) => a + o.findings, 0);
    case "criticalFindings":
      return ops.reduce((a, o) => a + o.criticalFindings, 0);
    case "avgRisk":
      return Math.round(mean(ops.map((o) => o.riskScore)));
    case "avgCompletion":
      return Math.round(mean(ops.map((o) => o.completion)) * 100);
    case "avgClosure":
      return Math.round(mean(ops.map((o) => o.recClosureRate)) * 100);
  }
}

/** انحدار خطي بسيط: يعيد التوقع للقيمة التالية */
function linearForecast(ys: number[]): number {
  const n = ys.length;
  if (n < 2) return ys[0] ?? 0;
  const xs = ys.map((_, i) => i);
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = my - slope * mx;
  return Math.max(0, Math.round(slope * n + intercept));
}

export interface TrendPointF {
  year: number;
  value: number;
  forecast: boolean;
}

export function trendSeries(
  data: AuditDataByYear,
  key: TrendMetricKey,
  type: AuditType | "الكل"
): TrendPointF[] {
  const pts: TrendPointF[] = YEARS.map((y) => {
    let ops = data[y] || [];
    if (type !== "الكل") ops = ops.filter((o) => o.type === type);
    return { year: y, value: aggregateMetric(ops, key), forecast: false };
  });
  const next = linearForecast(pts.map((p) => p.value));
  pts.push({ year: (YEARS[YEARS.length - 1] as number) + 1, value: next, forecast: true });
  return pts;
}

// ===== مصفوفة التغير السنوي (YoY) =====
export interface YoYResult {
  opNames: string[];
  periods: string[];
  values: Record<string, Record<string, { change: number; from: number; to: number } | null>>;
}

export function yoyVariance(data: AuditDataByYear, key: OpMetricKey): YoYResult {
  const names = new Set<string>();
  for (const y of YEARS) for (const o of data[y] || []) names.add(o.name);
  const opNames = Array.from(names);
  const periods: string[] = [];
  for (let i = 0; i < YEARS.length - 1; i++) periods.push(`${YEARS[i]}→${YEARS[i + 1]}`);

  const values: YoYResult["values"] = {};
  for (const name of opNames) {
    values[name] = {};
    for (let i = 0; i < YEARS.length - 1; i++) {
      const a = (data[YEARS[i]] || []).find((o) => o.name === name);
      const b = (data[YEARS[i + 1]] || []).find((o) => o.name === name);
      const period = `${YEARS[i]}→${YEARS[i + 1]}`;
      if (a && b) {
        const from = a[key] as number;
        const to = b[key] as number;
        values[name][period] = { change: to - from, from, to };
      } else {
        values[name][period] = null;
      }
    }
  }
  return { opNames, periods, values };
}

type OpMetricKey =
  | "riskScore"
  | "completion"
  | "findings"
  | "criticalFindings"
  | "recClosureRate"
  | "actualDuration";

// ===== التقسيم الطبقي للمخاطر =====
export interface RiskTier {
  name: string;
  min: number;
  max: number;
  color: string;
  count: number;
  pct: number;
  avgFindings: number;
  incomplete: number;
}

export function riskStrata(ops: AuditOperation[]): RiskTier[] {
  const defs = [
    { name: "حرجة", min: 75, max: 100, color: "#ef4444" },
    { name: "متوسطة", min: 45, max: 74, color: "#f59e0b" },
    { name: "منخفضة", min: 1, max: 44, color: "#10b981" },
  ];
  return defs.map((d) => {
    const list = ops.filter((o) => o.riskScore >= d.min && o.riskScore <= d.max);
    return {
      ...d,
      count: list.length,
      pct: ratio(list.length, ops.length),
      avgFindings: Math.round(mean(list.map((o) => o.findings))),
      incomplete: list.filter((o) => o.status !== "مكتملة").length,
    };
  });
}

// ===== بطاقة أداء الإدارات =====
export interface DeptScore {
  department: string;
  score: number; // 0..100
  rating: "ممتاز" | "جيد" | "يحتاج تحسين";
  count: number;
}

export function departmentScorecard(ops: AuditOperation[]): DeptScore[] {
  const map = new Map<string, AuditOperation[]>();
  for (const o of ops) {
    const arr = map.get(o.department) || [];
    arr.push(o);
    map.set(o.department, arr);
  }
  const out: DeptScore[] = [];
  for (const [department, list] of map) {
    const completion = mean(list.map((o) => o.completion));
    const closure = mean(list.map((o) => o.recClosureRate));
    const totalFindings = list.reduce((a, o) => a + o.findings, 0);
    const totalCritical = list.reduce((a, o) => a + o.criticalFindings, 0);
    const criticalRatio = totalFindings > 0 ? totalCritical / totalFindings : 0;
    const score = Math.round((completion * 0.4 + closure * 0.4 + (1 - criticalRatio) * 0.2) * 100);
    const rating = score >= 80 ? "ممتاز" : score >= 60 ? "جيد" : "يحتاج تحسين";
    out.push({ department, score, rating, count: list.length });
  }
  return out.sort((a, b) => b.score - a.score);
}

/** مطابقة العمليات بين سنتين بالاسم (أساس المقارنة) */
export function matchByName(
  a: AuditOperation[],
  b: AuditOperation[]
): { name: string; a: AuditOperation | null; b: AuditOperation | null }[] {
  const names = new Set<string>([...a.map((o) => o.name), ...b.map((o) => o.name)]);
  const mapA = new Map(a.map((o) => [o.name, o]));
  const mapB = new Map(b.map((o) => [o.name, o]));
  return Array.from(names).map((name) => ({
    name,
    a: mapA.get(name) || null,
    b: mapB.get(name) || null,
  }));
}
