import { Select } from "./Select";
import { useAuditStore } from "../../store/auditStore";
import { YEARS, AUDIT_TYPES, AUDIT_STATUSES, QUARTERS } from "../../types/audit";
import type { AuditYear, Quarter } from "../../types/audit";
import type { TypeFilter, StatusFilter, QuarterFilter } from "../../store/auditStore";

/** فلاتر عامة (السنة/النوع/الحالة/الربع) تُحدّث المخزن المركزي فوراً */
export function GlobalFilters() {
  const { year, type, status, quarter, setYear, setType, setStatus, setQuarter } =
    useAuditStore();

  return (
    <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-3 flex flex-wrap items-end gap-3">
      <Select<AuditYear>
        label="السنة"
        value={year}
        onChange={setYear}
        options={YEARS.map((y) => ({ value: y, label: String(y) }))}
      />
      <Select<TypeFilter>
        label="نوع المراجعة"
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
      <Select<QuarterFilter>
        label="الربع السنوي"
        value={quarter}
        onChange={setQuarter}
        options={[
          { value: "الكل", label: "كل الأرباع" },
          ...QUARTERS.map((q) => ({ value: q as Quarter as QuarterFilter, label: q })),
        ]}
      />
    </div>
  );
}
