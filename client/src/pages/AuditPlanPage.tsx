import { useState, useMemo } from "react";
import { Search, RotateCcw, FileSpreadsheet, FileText, Table2, CalendarRange } from "lucide-react";
import { useAuditStore, selectYearOps, applyFilters } from "../store/auditStore";
import type {
  TypeFilter,
  StatusFilter,
  RiskFilter,
  QuarterFilter,
  PhaseFilter,
} from "../store/auditStore";
import {
  YEARS,
  AUDIT_TYPES,
  AUDIT_STATUSES,
  RISK_LEVELS,
  QUARTERS,
  PHASES,
} from "../types/audit";
import type { AuditYear, Quarter, AuditPhase } from "../types/audit";
import { Card } from "../components/common/Card";
import { Select } from "../components/common/Select";
import { PageSkeleton } from "../components/common/Skeleton";
import { DataTable } from "../components/AuditTable/DataTable";
import { TimelineView } from "../components/AuditTable/TimelineView";
import { exportToExcel, exportToPDF } from "../utils/export";

export default function AuditPlanPage() {
  const data = useAuditStore((s) => s.data);
  const loading = useAuditStore((s) => s.loading);
  const yearOps = useAuditStore(selectYearOps);
  const {
    year, type, status, risk, quarter, phase, search,
    setYear, setType, setStatus, setRisk, setQuarter, setPhase, setSearch, resetFilters,
  } = useAuditStore();
  const [view, setView] = useState<"table" | "timeline">("table");

  const filtered = useMemo(
    () => applyFilters(yearOps, { type, status, risk, quarter, phase, search }),
    [yearOps, type, status, risk, quarter, phase, search]
  );

  if (loading || !data) return <PageSkeleton />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-navy">خطة المراجعة</h2>
          <p className="text-sm text-slate-500">
            عرض تفصيلي لعمليات سنة <span className="nums">{year}</span> ({filtered.length} عملية)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportToExcel(filtered, year)}
            className="flex items-center gap-1.5 text-sm bg-status-done text-white px-3 py-2 rounded-lg hover:brightness-95"
          >
            <FileSpreadsheet size={16} /> تصدير Excel
          </button>
          <button
            onClick={() => exportToPDF(filtered, year)}
            className="flex items-center gap-1.5 text-sm bg-navy text-white px-3 py-2 rounded-lg hover:bg-navy-700"
          >
            <FileText size={16} /> تصدير PDF
          </button>
        </div>
      </div>

      {/* الفلاتر */}
      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <Select<AuditYear>
            label="السنة"
            value={year}
            onChange={setYear}
            options={YEARS.map((y) => ({ value: y, label: String(y) }))}
          />
          <label className="flex flex-col gap-1 text-sm flex-1 min-w-[180px]">
            <span className="text-slate-500 text-xs">بحث</span>
            <div className="relative">
              <Search size={16} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث في الاسم، الإدارة، المسؤول، التعليقات…"
                className="w-full bg-white border border-slate-300 rounded-lg pr-9 pl-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy/30"
              />
            </div>
          </label>
          <Select<TypeFilter>
            label="النوع"
            value={type}
            onChange={setType}
            options={[
              { value: "الكل", label: "كل الأنواع" },
              ...AUDIT_TYPES.map((t) => ({ value: t as TypeFilter, label: t })),
            ]}
          />
          <Select<StatusFilter>
            label="الحالة"
            value={status}
            onChange={setStatus}
            options={[
              { value: "الكل", label: "كل الحالات" },
              ...AUDIT_STATUSES.map((s) => ({ value: s as StatusFilter, label: s })),
            ]}
          />
          <Select<RiskFilter>
            label="الخطورة"
            value={risk}
            onChange={setRisk}
            options={[
              { value: "الكل", label: "كل المستويات" },
              ...RISK_LEVELS.map((r) => ({ value: r as RiskFilter, label: r })),
            ]}
          />
          <Select<QuarterFilter>
            label="الربع"
            value={quarter}
            onChange={setQuarter}
            options={[
              { value: "الكل", label: "كل الأرباع" },
              ...QUARTERS.map((q) => ({ value: q as Quarter as QuarterFilter, label: q })),
            ]}
          />
          <Select<PhaseFilter>
            label="المرحلة"
            value={phase}
            onChange={setPhase}
            options={[
              { value: "الكل", label: "كل المراحل" },
              ...PHASES.map((p) => ({ value: p as AuditPhase as PhaseFilter, label: p })),
            ]}
          />
          <button
            onClick={resetFilters}
            className="flex items-center gap-1.5 text-sm text-slate-600 border border-slate-300 px-3 py-2 rounded-lg hover:bg-slate-50"
          >
            <RotateCcw size={15} /> إعادة ضبط
          </button>
        </div>
      </Card>

      {/* تبديل العرض */}
      <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setView("table")}
          className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors ${
            view === "table" ? "bg-white text-navy shadow-sm font-medium" : "text-slate-500"
          }`}
        >
          <Table2 size={16} /> عرض جدول
        </button>
        <button
          onClick={() => setView("timeline")}
          className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors ${
            view === "timeline" ? "bg-white text-navy shadow-sm font-medium" : "text-slate-500"
          }`}
        >
          <CalendarRange size={16} /> عرض زمني
        </button>
      </div>

      <Card>
        {view === "table" ? (
          <DataTable ops={filtered} />
        ) : (
          <TimelineView ops={filtered} year={year} />
        )}
      </Card>
    </div>
  );
}
