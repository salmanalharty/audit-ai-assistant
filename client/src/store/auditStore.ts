// مخزن مركزي (Zustand): بيانات الإكسل + حالة الفلاتر العامة.
import { create } from "zustand";
import type {
  AuditDataByYear,
  AuditOperation,
  AuditYear,
  AuditType,
  AuditStatus,
  RiskLevel,
  Quarter,
  AuditPhase,
} from "../types/audit";
import type { FollowUpObservation } from "../types/followup";
import { loadAuditData } from "../hooks/useAuditData";

export type TypeFilter = AuditType | "الكل";
export type StatusFilter = AuditStatus | "الكل";
export type RiskFilter = RiskLevel | "الكل";
export type QuarterFilter = Quarter | "الكل";
export type PhaseFilter = AuditPhase | "الكل";

interface AuditState {
  data: AuditDataByYear | null;
  followUp: FollowUpObservation[];
  loading: boolean;
  error: string | null;

  // الفلاتر العامة (تستخدمها لوحة التحكم وصفحة الخطة)
  year: AuditYear;
  type: TypeFilter;
  status: StatusFilter;
  risk: RiskFilter;
  quarter: QuarterFilter;
  phase: PhaseFilter;
  search: string;

  load: () => Promise<void>;
  setYear: (y: AuditYear) => void;
  setType: (t: TypeFilter) => void;
  setStatus: (s: StatusFilter) => void;
  setRisk: (r: RiskFilter) => void;
  setQuarter: (q: QuarterFilter) => void;
  setPhase: (p: PhaseFilter) => void;
  setSearch: (q: string) => void;
  resetFilters: () => void;
}

export const useAuditStore = create<AuditState>((set, get) => ({
  data: null,
  followUp: [],
  loading: false,
  error: null,

  year: 2025,
  type: "الكل",
  status: "الكل",
  risk: "الكل",
  quarter: "الكل",
  phase: "الكل",
  search: "",

  load: async () => {
    if (get().data || get().loading) return;
    set({ loading: true, error: null });
    try {
      const { byYear, followUp } = await loadAuditData();
      set({ data: byYear, followUp, loading: false });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : "خطأ غير معروف أثناء تحميل البيانات",
      });
    }
  },

  setYear: (year) => set({ year }),
  setType: (type) => set({ type }),
  setStatus: (status) => set({ status }),
  setRisk: (risk) => set({ risk }),
  setQuarter: (quarter) => set({ quarter }),
  setPhase: (phase) => set({ phase }),
  setSearch: (search) => set({ search }),
  resetFilters: () =>
    set({
      type: "الكل",
      status: "الكل",
      risk: "الكل",
      quarter: "الكل",
      phase: "الكل",
      search: "",
    }),
}));

// مرجع ثابت لمصفوفة فارغة لتجنّب حلقة getSnapshot اللانهائية في Zustand
const EMPTY_OPS: AuditOperation[] = [];

/** عمليات السنة المختارة فقط */
export function selectYearOps(state: AuditState): AuditOperation[] {
  if (!state.data) return EMPTY_OPS;
  return state.data[state.year] || EMPTY_OPS;
}

/** تطبيق الفلاتر (نوع/حالة/خطورة/بحث) على مجموعة عمليات */
export function applyFilters(
  ops: AuditOperation[],
  f: {
    type: TypeFilter;
    status: StatusFilter;
    risk: RiskFilter;
    search: string;
    quarter?: QuarterFilter;
    phase?: PhaseFilter;
  }
): AuditOperation[] {
  const q = f.search.trim().toLowerCase();
  return ops.filter((o) => {
    if (f.type !== "الكل" && o.type !== f.type) return false;
    if (f.status !== "الكل" && o.status !== f.status) return false;
    if (f.risk !== "الكل" && o.riskLevel !== f.risk) return false;
    if (f.quarter && f.quarter !== "الكل" && o.quarter !== f.quarter) return false;
    if (f.phase && f.phase !== "الكل" && o.phase !== f.phase) return false;
    if (q) {
      const hay = `${o.name} ${o.department} ${o.owner} ${o.comments}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}
