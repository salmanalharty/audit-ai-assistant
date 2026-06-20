import { Fragment, useMemo, useState, type ReactNode } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
  BarChart,
  Bar,
  ReferenceLine,
} from "recharts";
import { AlertTriangle, Sparkles } from "lucide-react";
import type { AuditDataByYear, AuditOperation, AuditType } from "../../types/audit";
import { AUDIT_TYPES, YEARS } from "../../types/audit";
import {
  agingAnalysis,
  detectAnomalies,
  coverageMatrix,
  trendSeries,
  TREND_METRICS,
  yoyVariance,
  riskStrata,
  departmentScorecard,
  type TrendMetric,
} from "../../utils/calculations";
import { OP_METRICS, type OpMetric } from "../../utils/metrics";
import { TYPE_COLORS } from "../../utils/theme";
import { ProgressBar } from "../common/ProgressBar";
import { EmptyState } from "../common/EmptyState";
import { Select } from "../common/Select";
import { StatusBadge, PhaseBadge, TypeBadge } from "../common/Badge";
import { formatPercent } from "../../utils/format";

const tip = { fontSize: 12, borderRadius: 10, border: "1px solid #e2e8f0" };

/** سطر تعريفي موجز أسفل عنوان كل تحليل */
export function Hint({ children }: { children: ReactNode }) {
  return <p className="text-[11px] text-slate-400 mb-3 -mt-1">{children}</p>;
}

// ===================== إصلاح: تحليل الأعمار والتأخير =====================
export function AgingAnalysis({ ops }: { ops: AuditOperation[] }) {
  const rows = useMemo(() => agingAnalysis(ops), [ops]);
  if (rows.length === 0)
    return <EmptyState message="لا توجد عمليات متأخرة في هذه السنة ✅" />;

  function badge(d: number) {
    if (d > 30) return { bg: "#fde2e2", text: "#b91c1c" };
    if (d >= 15) return { bg: "#ffe9d1", text: "#b45309" };
    return { bg: "#fef9c3", text: "#a16207" };
  }

  return (
    <div className="overflow-x-auto border border-slate-200 rounded-xl">
      <table className="w-full text-sm whitespace-nowrap border-collapse [&_th]:border [&_th]:border-slate-200/70 [&_td]:border [&_td]:border-slate-100">
        <thead>
          <tr className="bg-navy-50 text-navy text-xs">
            <th className="text-right font-semibold py-2.5 px-3 border-b border-slate-200">العملية</th>
            <th className="text-center font-semibold py-2.5 px-3 border-b border-r border-slate-200">النوع</th>
            <th className="text-right font-semibold py-2.5 px-3 border-b border-r border-slate-200">الإدارة</th>
            <th className="text-center font-semibold py-2.5 px-3 border-b border-r border-slate-200">الحالة</th>
            <th className="text-center font-semibold py-2.5 px-3 border-b border-r border-slate-200">المرحلة</th>
            <th className="text-center font-semibold py-2.5 px-3 border-b border-r border-slate-200">المخططة (يوم)</th>
            <th className="text-center font-semibold py-2.5 px-3 border-b border-r border-slate-200">الفعلية (يوم)</th>
            <th className="text-center font-semibold py-2.5 px-3 border-b border-r border-slate-200">أيام التأخير</th>
            <th className="text-center font-semibold py-2.5 px-3 border-b border-r border-slate-200 min-w-[120px]">الإنجاز</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ op, delayDays }, idx) => {
            const c = badge(delayDays);
            return (
              <tr key={op.id} className={idx % 2 === 1 ? "bg-slate-50/60" : "bg-white"}>
                <td className="py-2.5 px-3 font-medium text-slate-800 border-b border-slate-100">{op.name}</td>
                <td className="py-2.5 px-3 text-center border-b border-r border-slate-100">
                  <TypeBadge type={op.type} />
                </td>
                <td className="py-2.5 px-3 text-slate-600 border-b border-r border-slate-100">{op.department}</td>
                <td className="py-2.5 px-3 text-center border-b border-r border-slate-100">
                  {op.status === "مكتملة" ? (
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap" style={{ color: "#7c3aed", backgroundColor: "#e9d5ff" }}>
                      مكتملة متأخرة
                    </span>
                  ) : (
                    <StatusBadge status={op.status} />
                  )}
                </td>
                <td className="py-2.5 px-3 text-center border-b border-r border-slate-100">
                  <PhaseBadge phase={op.phase} />
                </td>
                <td className="py-2.5 px-3 nums text-center text-slate-600 border-b border-r border-slate-100">{op.plannedDuration}</td>
                <td className="py-2.5 px-3 nums text-center text-slate-600 border-b border-r border-slate-100">{op.actualDuration}</td>
                <td className="py-2.5 px-3 text-center border-b border-r border-slate-100">
                  <span
                    className="nums inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap"
                    style={{ backgroundColor: c.bg, color: c.text }}
                  >
                    {delayDays} يوم
                  </span>
                </td>
                <td className="py-2.5 px-3 border-b border-r border-slate-100">
                  <ProgressBar value={op.completion} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ===================== كاشف الشذوذ (كما هو) =====================
export function AnomalyDetection({ ops }: { ops: AuditOperation[] }) {
  const anomalies = useMemo(() => detectAnomalies(ops), [ops]);
  if (anomalies.length === 0)
    return <EmptyState message="لم يُكتشف أي شذوذ في البيانات ✅" />;
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {anomalies.map((a, i) => (
        <div key={i} className="flex gap-3 p-3 rounded-xl border border-amber-200 bg-amber-50/60">
          <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800">{a.op.name}</p>
            <p className="text-xs text-amber-700 font-medium mt-0.5">{a.type}</p>
            <p className="text-xs text-slate-600 mt-1">{a.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ===================== إصلاح: تغطية مجتمع المراجعة =====================
export function CoverageMatrix({ data }: { data: AuditDataByYear }) {
  const matrix = useMemo(() => coverageMatrix(data), [data]);
  const cellStyle: Record<string, { bg: string; label: string }> = {
    completed: { bg: "#10b981", label: "مكتملة" },
    inProgress: { bg: "#f59e0b", label: "قيد التنفيذ" },
    notReviewed: { bg: "#e5e7eb", label: "لم تُراجع" },
  };
  return (
    <div>
      <p className="text-sm text-slate-600 mb-3">
        تمت تغطية <span className="nums font-bold text-navy">{matrix.summary.covered}</span> إدارة من أصل{" "}
        <span className="nums font-bold text-navy">{matrix.summary.total}</span> خلال السنوات الخمس.
      </p>
      <div className="overflow-x-auto">
        <div
          className="grid gap-1.5 min-w-[560px]"
          style={{ gridTemplateColumns: `minmax(160px, 1.6fr) repeat(5, minmax(54px, 1fr)) 64px` }}
        >
          {/* رؤوس */}
          <div className="text-xs text-slate-500 font-semibold self-center px-1">الإدارة</div>
          {YEARS.map((y) => (
            <div key={y} className="text-xs text-slate-600 font-semibold nums text-center self-center">
              {y}
            </div>
          ))}
          <div className="text-xs text-slate-600 font-semibold text-center self-center">التغطية</div>
          {/* الصفوف */}
          {matrix.departments.map((dept) => (
            <Fragment key={dept}>
              <div className="text-xs text-slate-700 truncate text-right self-center px-1" title={dept}>
                {dept}
              </div>
              {YEARS.map((y) => {
                const cell = matrix.cells[dept][y];
                const s = cellStyle[cell];
                return (
                  <div
                    key={y}
                    className="h-8 rounded-lg flex items-center justify-center text-[11px] font-medium"
                    style={{ backgroundColor: s.bg, color: cell === "notReviewed" ? "#9ca3af" : "#fff" }}
                    title={`${dept} · ${y}: ${s.label}`}
                  >
                    {cell === "notReviewed" ? "—" : s.label}
                  </div>
                );
              })}
              <div
                className="nums text-xs font-bold flex items-center justify-center"
                style={{ color: matrix.coverage[dept] < 0.5 ? "#b91c1c" : "#0f7a55" }}
              >
                {formatPercent(matrix.coverage[dept])}
              </div>
            </Fragment>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-3 mt-3">
        {Object.values(cellStyle).map((s) => (
          <span key={s.label} className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <span className="w-3 h-3 rounded" style={{ backgroundColor: s.bg }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ===================== إضافة: تحليل المخطط مقابل الفعلي =====================
export function PlannedVsActual({ ops }: { ops: AuditOperation[] }) {
  const data = ops.map((o) => ({
    name: o.name.replace("مراجعة ", ""),
    المخطط: o.plannedDuration,
    الفعلي: o.actualDuration,
    late: o.delayDays > 0,
  }));
  if (data.length === 0) return <EmptyState message="لا توجد بيانات" />;

  const within = ops.filter((o) => o.delayDays === 0).length;
  const exceeded = ops.filter((o) => o.delayDays > 0);
  const avgExceed =
    exceeded.length > 0
      ? Math.round(exceeded.reduce((a, o) => a + o.delayDays, 0) / exceeded.length)
      : 0;
  const avgPlanned = Math.round(ops.reduce((a, o) => a + o.plannedDuration, 0) / ops.length);

  return (
    <div>
      <p className="text-sm text-slate-600 mb-2">
        <span className="nums font-bold text-status-done">{within}</span> عملية ضمن المدة المخططة ·{" "}
        <span className="nums font-bold text-status-postponed">{exceeded.length}</span> تجاوزتها بمتوسط تجاوز{" "}
        <span className="nums font-bold">{avgExceed}</span> يوم.
      </p>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} margin={{ bottom: 70 }} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={tip} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <ReferenceLine
            y={avgPlanned}
            stroke="#94a3b8"
            strokeDasharray="4 4"
            label={{ value: `متوسط المخطط ${avgPlanned}ي`, fontSize: 10, fill: "#64748b", position: "insideTopRight" }}
          />
          <Bar dataKey="المخطط" fill="#cbd5e1" radius={[3, 3, 0, 0]} />
          <Bar dataKey="الفعلي" radius={[3, 3, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.late ? "#ef4444" : "#1f3864"} stroke={d.late ? "#b91c1c" : "none"} strokeWidth={d.late ? 1.5 : 0} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ===================== إضافة: اتجاه 5 سنوات + تنبؤ =====================
export function TrendForecast({ data }: { data: AuditDataByYear }) {
  const [metric, setMetric] = useState<TrendMetric>(TREND_METRICS[0]);
  const [type, setType] = useState<AuditType | "الكل">("الكل");

  const lastYear = YEARS[YEARS.length - 1] as number;
  const series = useMemo(() => trendSeries(data, metric.key, type), [data, metric, type]);
  const chartData = series.map((p) => ({
    year: String(p.year),
    القيمة: p.forecast ? null : p.value,
    المتوقع: p.forecast || p.year === lastYear ? p.value : null,
  }));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <Select<string>
          label="المؤشر"
          value={metric.key}
          onChange={(k) => setMetric(TREND_METRICS.find((m) => m.key === k) ?? TREND_METRICS[0])}
          options={TREND_METRICS.map((m) => ({ value: m.key, label: m.label }))}
        />
        <Select<string>
          label="نوع المراجعة"
          value={type}
          onChange={(t) => setType(t as AuditType | "الكل")}
          options={[
            { value: "الكل", label: "كل الأنواع" },
            ...AUDIT_TYPES.map((t) => ({ value: t, label: t })),
          ]}
        />
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={tip}
            formatter={(v) => [metric.isPercent ? `${v}%` : v, metric.label]}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="القيمة" stroke="#1f3864" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
          <Line
            type="monotone"
            dataKey="المتوقع"
            stroke="#c9a94e"
            strokeWidth={2.5}
            strokeDasharray="5 4"
            dot={{ r: 3 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-[11px] text-slate-400 text-center -mt-1">
        الخط الذهبي المنقّط = القيمة المتوقعة لسنة {lastYear + 1} (انحدار خطي بسيط).
      </p>
    </div>
  );
}

// ===================== إضافة: مصفوفة التغير السنوي (YoY) =====================
const YOY_METRICS = OP_METRICS.filter((m) =>
  ["riskScore", "findings", "recClosureRate"].includes(m.key)
);

export function YoYVariance({ data }: { data: AuditDataByYear }) {
  const [metric, setMetric] = useState<OpMetric>(YOY_METRICS[0]);
  const result = useMemo(() => yoyVariance(data, metric.key), [data, metric]);

  // أقصى تغيّر مطلق للتطبيع
  const maxAbs = useMemo(() => {
    let m = 0;
    for (const name of result.opNames)
      for (const p of result.periods) {
        const c = result.values[name][p];
        if (c) m = Math.max(m, Math.abs(c.change));
      }
    return m || 1;
  }, [result]);

  function cellColor(change: number) {
    if (Math.abs(change) < 0.0001) return { bg: "#f1f5f9", text: "#94a3b8" };
    const improved = metric.goodWhenUp ? change > 0 : change < 0;
    const intensity = Math.min(1, Math.abs(change) / maxAbs);
    const alpha = 0.18 + intensity * 0.62;
    return improved
      ? { bg: `rgba(16,185,129,${alpha})`, text: "#064e3b" }
      : { bg: `rgba(239,68,68,${alpha})`, text: "#7f1d1d" };
  }

  function fmt(v: number) {
    return metric.isPercent ? `${Math.round(v * 100)}%` : String(v);
  }

  return (
    <div className="space-y-3">
      <Select<string>
        label="المؤشر المقاس"
        value={metric.key}
        onChange={(k) => setMetric(YOY_METRICS.find((m) => m.key === k) ?? YOY_METRICS[0])}
        options={YOY_METRICS.map((m) => ({ value: m.key, label: m.label }))}
      />
      <div className="overflow-x-auto">
        <div
          className="grid gap-1.5 min-w-[520px]"
          style={{
            gridTemplateColumns: `minmax(160px, 1.6fr) repeat(${result.periods.length}, minmax(66px, 1fr))`,
          }}
        >
          {/* رؤوس */}
          <div className="text-xs text-slate-500 font-semibold px-2 self-center">العملية</div>
          {result.periods.map((p) => (
            <div key={p} className="text-[11px] text-slate-600 font-semibold nums text-center self-center">
              {p}
            </div>
          ))}
          {/* الصفوف */}
          {result.opNames.map((name) => (
            <Fragment key={name}>
              <div
                className="text-xs text-slate-700 truncate text-right px-2 self-center"
                title={name}
              >
                {name.replace("مراجعة ", "")}
              </div>
              {result.periods.map((p) => {
                const c = result.values[name][p];
                if (!c)
                  return (
                    <div
                      key={p}
                      className="h-8 rounded-md bg-slate-50 flex items-center justify-center text-[10px] text-slate-300"
                    >
                      —
                    </div>
                  );
                const col = cellColor(c.change);
                const sign = c.change > 0 ? "+" : "";
                return (
                  <div
                    key={p}
                    className="h-8 rounded-md flex items-center justify-center text-[11px] font-bold nums"
                    style={{ backgroundColor: col.bg, color: col.text }}
                    title={`${fmt(c.from)} ← ${fmt(c.to)}`}
                  >
                    {sign}
                    {fmt(c.change)}
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
      <div className="flex gap-3 text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded" style={{ backgroundColor: "rgba(16,185,129,0.7)" }} /> تحسّن
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded" style={{ backgroundColor: "rgba(239,68,68,0.7)" }} /> تدهور
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-slate-200" /> لا تغيّر
        </span>
      </div>
    </div>
  );
}

// ===================== إضافة: التقسيم الطبقي للمخاطر =====================
export function RiskStratification({ ops }: { ops: AuditOperation[] }) {
  const tiers = useMemo(() => riskStrata(ops), [ops]);
  if (ops.length === 0) return <EmptyState message="لا توجد بيانات" />;
  const critical = tiers.find((t) => t.name === "حرجة")!;
  const criticalIncompletePct = critical.count > 0 ? critical.incomplete / critical.count : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {tiers.map((t) => (
          <div
            key={t.name}
            className="rounded-xl border p-4"
            style={{ borderColor: `${t.color}55`, backgroundColor: `${t.color}10` }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold" style={{ color: t.color }}>
                {t.name}
              </span>
              <span className="nums text-2xl font-bold text-navy">{t.count}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1 nums">{formatPercent(t.pct)} من العمليات</p>
            <div className="mt-2 text-xs text-slate-600 flex justify-between">
              <span className="nums">متوسط الملاحظات: {t.avgFindings}</span>
              <span className="nums">غير مكتملة: {t.incomplete}</span>
            </div>
          </div>
        ))}
      </div>

      {/* شريط مكدّس */}
      <div className="flex h-4 rounded-full overflow-hidden">
        {tiers.map((t) => (
          <div key={t.name} style={{ width: `${t.pct * 100}%`, backgroundColor: t.color }} title={`${t.name} (${t.count})`} />
        ))}
      </div>

      {critical.incomplete > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
          <Sparkles size={16} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">
            <span className="nums font-bold">{formatPercent(criticalIncompletePct)}</span> من العمليات الحرجة (
            {critical.incomplete} من {critical.count}) لم تكتمل بعد — تتطلب أولوية متابعة عاجلة.
          </p>
        </div>
      )}
    </div>
  );
}

// ===================== إضافة: تحليل الارتباط (المخاطر مقابل الملاحظات) =====================
export function RiskDistribution({ ops }: { ops: AuditOperation[] }) {
  // شاذ: مخاطر عالية (>75) وملاحظات قليلة (<=2) → مراجعة سطحية محتملة
  const isAnomaly = (o: { x: number; y: number }) => o.x > 75 && o.y <= 2;
  const byType = AUDIT_TYPES.map((t) => ({
    type: t,
    points: ops
      .filter((o) => o.type === t)
      .map((o) => ({ x: o.riskScore, y: o.findings, z: o.actualDuration, name: o.name })),
  })).filter((g) => g.points.length > 0);

  if (byType.length === 0) return <EmptyState message="لا توجد بيانات" />;

  return (
    <ResponsiveContainer width="100%" height={320}>
      <ScatterChart margin={{ bottom: 10, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
        <XAxis type="number" dataKey="x" name="درجة المخاطر" tick={{ fontSize: 11 }} label={{ value: "درجة المخاطر", position: "insideBottom", offset: -2, fontSize: 11 }} />
        <YAxis type="number" dataKey="y" name="عدد الملاحظات" tick={{ fontSize: 11 }} label={{ value: "الملاحظات", angle: -90, position: "insideLeft", fontSize: 11 }} />
        <ZAxis type="number" dataKey="z" range={[60, 400]} name="المدة" />
        <Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={tip} formatter={(value, name) => [value as number, name as string]} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {byType.map((g) => (
          <Scatter key={g.type} name={g.type} data={g.points} fill={TYPE_COLORS[g.type]}>
            {g.points.map((p, i) => (
              <Cell
                key={i}
                fill={TYPE_COLORS[g.type]}
                fillOpacity={0.7}
                stroke={isAnomaly(p) ? "#b91c1c" : "none"}
                strokeWidth={isAnomaly(p) ? 2 : 0}
                strokeDasharray={isAnomaly(p) ? "3 2" : undefined}
              />
            ))}
          </Scatter>
        ))}
      </ScatterChart>
    </ResponsiveContainer>
  );
}

// ===================== إضافة: بطاقة أداء الإدارات =====================
export function DepartmentScorecard({ ops }: { ops: AuditOperation[] }) {
  const rows = useMemo(() => departmentScorecard(ops), [ops]);
  if (rows.length === 0) return <EmptyState message="لا توجد بيانات" />;

  function color(score: number) {
    return score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-slate-500 text-xs border-b border-slate-200">
            <th className="text-right font-medium py-2 px-2">الإدارة</th>
            <th className="text-right font-medium py-2 px-2">العمليات</th>
            <th className="text-right font-medium py-2 px-2 min-w-[160px]">الدرجة</th>
            <th className="text-right font-medium py-2 px-2">التصنيف</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.department} className="border-b border-slate-100">
              <td className="py-2.5 px-2 font-medium text-slate-800">{r.department}</td>
              <td className="py-2.5 px-2 nums text-slate-600">{r.count}</td>
              <td className="py-2.5 px-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${r.score}%`, backgroundColor: color(r.score) }} />
                  </div>
                  <span className="nums text-xs font-bold w-8" style={{ color: color(r.score) }}>
                    {r.score}
                  </span>
                </div>
              </td>
              <td className="py-2.5 px-2">
                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ color: color(r.score), backgroundColor: `${color(r.score)}1a` }}>
                  {r.rating}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
