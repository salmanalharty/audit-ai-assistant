import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import type { AuditOperation, AuditDataByYear } from "../../types/audit";
import { AUDIT_STATUSES, AUDIT_TYPES, YEARS, PHASES, QUARTERS } from "../../types/audit";
import { countByStatus, countByType, countByPhase, countByQuarter } from "../../utils/calculations";
import { STATUS_COLORS, TYPE_COLORS, PHASE_COLORS } from "../../utils/theme";
import { EmptyState } from "../common/EmptyState";

const tooltipStyle = {
  fontSize: 12,
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  fontFamily: "inherit",
};

/** توزيع العمليات حسب النوع (Donut) */
export function TypeDonut({ ops }: { ops: AuditOperation[] }) {
  const counts = countByType(ops);
  const data = AUDIT_TYPES.map((t) => ({ name: t, value: counts[t] })).filter(
    (d) => d.value > 0
  );
  if (data.length === 0) return <EmptyState message="لا توجد بيانات" />;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={2}
        >
          {data.map((d) => (
            <Cell key={d.name} fill={TYPE_COLORS[d.name]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend
          wrapperStyle={{ fontSize: 12 }}
          formatter={(v) => {
            const item = data.find((d) => d.name === v);
            return `${v} (${item?.value ?? 0})`;
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

/** توزيع العمليات حسب الحالة (Donut) */
export function StatusDonut({ ops }: { ops: AuditOperation[] }) {
  const counts = countByStatus(ops);
  const data = AUDIT_STATUSES.map((s) => ({ name: s, value: counts[s] })).filter(
    (d) => d.value > 0
  );
  if (data.length === 0) return <EmptyState message="لا توجد بيانات" />;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={2}
        >
          {data.map((d) => (
            <Cell key={d.name} fill={STATUS_COLORS[d.name].hex} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend
          wrapperStyle={{ fontSize: 12 }}
          formatter={(v) => {
            const item = data.find((d) => d.name === v);
            return `${v} (${item?.value ?? 0})`;
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

/** توزيع العمليات حسب المرحلة (Donut) */
export function PhaseDonut({ ops }: { ops: AuditOperation[] }) {
  const counts = countByPhase(ops);
  const data = PHASES.map((p) => ({ name: p, value: counts[p] })).filter((d) => d.value > 0);
  if (data.length === 0) return <EmptyState message="لا توجد بيانات" />;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
          {data.map((d) => (
            <Cell key={d.name} fill={PHASE_COLORS[d.name].hex} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend
          wrapperStyle={{ fontSize: 12 }}
          formatter={(v) => {
            const item = data.find((d) => d.name === v);
            return `${v} (${item?.value ?? 0})`;
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

/** توزيع العمليات حسب الربع السنوي (Bar عمودي) */
export function QuarterBar({ ops }: { ops: AuditOperation[] }) {
  const counts = countByQuarter(ops);
  const data = QUARTERS.map((q) => ({ quarter: q, العدد: counts[q] }));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" vertical={false} />
        <XAxis dataKey="quarter" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="العدد" fill="#1f3864" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** مقارنة السنوات: مكتملة مقابل متبقية (Grouped Bar) */
export function YearsBar({ data }: { data: AuditDataByYear }) {
  const chart = YEARS.map((year) => {
    const ops = data[year] || [];
    const completed = ops.filter((o) => o.status === "مكتملة").length;
    return {
      year: String(year),
      مكتملة: completed,
      المتبقية: ops.length - completed,
    };
  });
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={chart} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" vertical={false} />
        <XAxis dataKey="year" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="مكتملة" fill="#10b981" radius={[4, 4, 0, 0]} />
        <Bar dataKey="المتبقية" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
