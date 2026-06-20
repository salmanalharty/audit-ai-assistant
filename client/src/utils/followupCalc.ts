// حسابات تقرير المتابعة (KPIs + تقنيات CAATs). دوال نقية تُقرأ من بيانات الشيت.
import type {
  FollowUpObservation,
  FollowUpCategory,
  ObsStatus,
} from "../types/followup";
import { FOLLOWUP_CATEGORIES, UNJUSTIFIED } from "../types/followup";
import type { AuditType, RiskLevel } from "../types/audit";
import { RISK_LEVELS } from "../types/audit";

export type AllOr<T> = T | "الكل";

export interface FollowFilters {
  year: number | "الكل";
  type: AllOr<AuditType>;
  department: string | "الكل";
  risk: AllOr<RiskLevel>;
  status: AllOr<ObsStatus>;
  category: AllOr<FollowUpCategory>;
  search?: string;
}

export function applyFollowFilters(
  obs: FollowUpObservation[],
  f: FollowFilters
): FollowUpObservation[] {
  const q = (f.search ?? "").trim().toLowerCase();
  return obs.filter((o) => {
    if (f.year !== "الكل" && o.year !== f.year) return false;
    if (f.type !== "الكل" && o.auditType !== f.type) return false;
    if (f.department !== "الكل" && o.department !== f.department) return false;
    if (f.risk !== "الكل" && o.riskLevel !== f.risk) return false;
    if (f.status !== "الكل" && o.status !== f.status) return false;
    if (f.category !== "الكل" && o.followUpCategory !== f.category) return false;
    if (q) {
      const hay = `${o.title} ${o.recommendation} ${o.operationName} ${o.department} ${o.justification}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function departments(obs: FollowUpObservation[]): string[] {
  return Array.from(new Set(obs.map((o) => o.department))).sort();
}

// ===== KPIs =====
export interface FollowKpis {
  total: number;
  closed: number;
  open: number;
  closureRate: number; // 0..1
  overdue: number; // تصنيف متأخرة
  deferred: number; // تصنيف مؤجلة
  unjustified: number; // مبرر = غير مبرر
  highRiskOpen: number; // عالي + لم تغلق
}

export function followKpis(obs: FollowUpObservation[]): FollowKpis {
  const total = obs.length;
  const closed = obs.filter((o) => o.status === "مغلقة").length;
  return {
    total,
    closed,
    open: total - closed,
    closureRate: total > 0 ? closed / total : 0,
    overdue: obs.filter((o) => o.followUpCategory === "متأخرة").length,
    deferred: obs.filter((o) => o.followUpCategory === "مؤجلة").length,
    unjustified: obs.filter((o) => o.justification === UNJUSTIFIED).length,
    highRiskOpen: obs.filter((o) => o.riskLevel === "عالي" && o.status === "لم تغلق").length,
  };
}

// ===== توزيع التصنيف =====
export function countByCategory(obs: FollowUpObservation[]): Record<FollowUpCategory, number> {
  const r = Object.fromEntries(FOLLOWUP_CATEGORIES.map((c) => [c, 0])) as Record<FollowUpCategory, number>;
  for (const o of obs) r[o.followUpCategory] = (r[o.followUpCategory] || 0) + 1;
  return r;
}

// ===== المفتوحة حسب الإدارة =====
export interface DeptOpen {
  department: string;
  open: number;
}
export function openByDepartment(obs: FollowUpObservation[]): DeptOpen[] {
  const map = new Map<string, number>();
  for (const o of obs) if (o.status === "لم تغلق") map.set(o.department, (map.get(o.department) || 0) + 1);
  return Array.from(map.entries())
    .map(([department, open]) => ({ department, open }))
    .sort((a, b) => b.open - a.open);
}

// ===== الخطر × الحالة (Stacked) =====
export interface RiskStatusRow {
  risk: RiskLevel;
  مغلقة: number;
  "لم تغلق": number;
}
export function riskByStatus(obs: FollowUpObservation[]): RiskStatusRow[] {
  return RISK_LEVELS.map((risk) => {
    const list = obs.filter((o) => o.riskLevel === risk);
    return {
      risk,
      مغلقة: list.filter((o) => o.status === "مغلقة").length,
      "لم تغلق": list.filter((o) => o.status === "لم تغلق").length,
    };
  });
}

// ===== أعمار الملاحظات المتأخرة =====
export function agingList(obs: FollowUpObservation[]): FollowUpObservation[] {
  return obs
    .filter((o) => o.status === "لم تغلق" && o.overdueDays > 0)
    .sort((a, b) => b.overdueDays - a.overdueDays);
}

// ===== اتجاه نسبة الإغلاق عبر السنوات =====
export interface ClosureTrendPoint {
  year: number;
  closureRate: number; // 0..100
  total: number;
}
export function closureTrend(all: FollowUpObservation[], years: number[]): ClosureTrendPoint[] {
  return years.map((year) => {
    const list = all.filter((o) => o.year === year);
    const closed = list.filter((o) => o.status === "مغلقة").length;
    return {
      year,
      closureRate: list.length ? Math.round((closed / list.length) * 100) : 0,
      total: list.length,
    };
  });
}

// ===== خريطة حرارية: الإدارة × السنة بنسبة الإغلاق =====
export interface HeatmapResult {
  departments: string[];
  years: number[];
  rate: Record<string, Record<number, number | null>>; // 0..1 أو null إن لا ملاحظات
}
export function deptYearHeatmap(all: FollowUpObservation[], years: number[]): HeatmapResult {
  const depts = departments(all);
  const rate: HeatmapResult["rate"] = {};
  for (const d of depts) {
    rate[d] = {};
    for (const y of years) {
      const list = all.filter((o) => o.department === d && o.year === y);
      rate[d][y] = list.length
        ? list.filter((o) => o.status === "مغلقة").length / list.length
        : null;
    }
  }
  return { departments: depts, years, rate };
}

// ===== كاشف الملاحظات المتكررة =====
export interface RepeatFinding {
  title: string;
  operationName: string;
  department: string;
  count: number; // عدد السنوات
  years: number[];
  openNow: boolean; // هل ما زالت مفتوحة في أحدث ظهور؟
}
export function repeatFindings(all: FollowUpObservation[]): RepeatFinding[] {
  const map = new Map<string, FollowUpObservation[]>();
  for (const o of all) {
    const key = `${o.title}||${o.operationName}`;
    const arr = map.get(key) || [];
    arr.push(o);
    map.set(key, arr);
  }
  const out: RepeatFinding[] = [];
  for (const arr of map.values()) {
    const years = Array.from(new Set(arr.map((o) => o.year))).sort();
    if (years.length < 2) continue;
    const latest = arr.reduce((a, b) => (b.year > a.year ? b : a));
    out.push({
      title: arr[0].title,
      operationName: arr[0].operationName,
      department: arr[0].department,
      count: years.length,
      years,
      openNow: latest.status === "لم تغلق",
    });
  }
  return out.sort((a, b) => b.count - a.count);
}

// ===== مصفوفة الأولوية (الخطر × التأخر) =====
export function riskToNum(r: RiskLevel): number {
  return r === "عالي" ? 3 : r === "متوسط" ? 2 : 1;
}
export interface PriorityPoint {
  x: number; // أيام التأخر
  y: number; // درجة الخطر 1-3
  z: number; // مرات التأجيل
  type: AuditType;
  obsId: string;
  title: string;
}
export function priorityPoints(obs: FollowUpObservation[]): PriorityPoint[] {
  return obs
    .filter((o) => o.status === "لم تغلق")
    .map((o) => ({
      x: o.overdueDays,
      y: riskToNum(o.riskLevel),
      z: o.deferralCount,
      type: o.auditType,
      obsId: o.obsId,
      title: o.title,
    }));
}

// ===== التأجيل المزمن =====
export function chronicDeferral(obs: FollowUpObservation[]): FollowUpObservation[] {
  return obs
    .filter((o) => o.deferralCount >= 2)
    .sort((a, b) => b.deferralCount - a.deferralCount);
}

// ===== الملاحظات غير المبررة =====
export function unjustifiedList(obs: FollowUpObservation[]): FollowUpObservation[] {
  return obs
    .filter((o) => o.justification === UNJUSTIFIED)
    .sort(
      (a, b) =>
        riskToNum(b.riskLevel) - riskToNum(a.riskLevel) || b.overdueDays - a.overdueDays
    );
}
