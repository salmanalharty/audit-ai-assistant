import { Fragment, useMemo, useState } from "react";
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
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  ZAxis,
  ReferenceArea,
} from "recharts";
import type { FollowUpObservation } from "../../types/followup";
import { FOLLOWUP_CATEGORIES } from "../../types/followup";
import { CATEGORY_COLORS, OBS_STATUS_COLORS, TYPE_COLORS } from "../../utils/theme";
import {
  countByCategory,
  openByDepartment,
  riskByStatus,
  agingList,
  closureTrend,
  deptYearHeatmap,
  priorityPoints,
} from "../../utils/followupCalc";
import { EmptyState } from "../common/EmptyState";

const tip = { fontSize: 12, borderRadius: 10, border: "1px solid #e2e8f0" };

/** لون متدرّج لنسبة الإغلاق: 0 أحمر ← 1 أخضر */
function closureColor(rate: number): string {
  const r = Math.max(0, Math.min(1, rate));
  const a = { r: 239, g: 68, b: 68 }; // أحمر
  const m = { r: 245, g: 158, b: 11 }; // أصفر
  const b = { r: 16, g: 185, b: 129 }; // أخضر
  const lerp = (x: { r: number; g: number; b: number }, y: { r: number; g: number; b: number }, t: number) =>
    `rgb(${Math.round(x.r + (y.r - x.r) * t)}, ${Math.round(x.g + (y.g - x.g) * t)}, ${Math.round(x.b + (y.b - x.b) * t)})`;
  return r < 0.5 ? lerp(a, m, r / 0.5) : lerp(m, b, (r - 0.5) / 0.5);
}

/** الرسم 1: توزيع التصنيف (Donut) */
export function CategoryDonut({ obs }: { obs: FollowUpObservation[] }) {
  const counts = countByCategory(obs);
  const data = FOLLOWUP_CATEGORIES.map((c) => ({ name: c, value: counts[c] })).filter((d) => d.value > 0);
  if (data.length === 0) return <EmptyState message="لا توجد بيانات" />;
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={2}>
            {data.map((d) => (
              <Cell key={d.name} fill={CATEGORY_COLORS[d.name].hex} />
            ))}
          </Pie>
          <Tooltip contentStyle={tip} formatter={(v) => [`${v} (${Math.round((Number(v) / obs.length) * 100)}%)`, ""]} />
          <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v) => `${v} (${counts[v as keyof typeof counts] ?? 0})`} />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-x-0 top-[88px] flex flex-col items-center pointer-events-none">
        <span className="nums text-2xl font-bold text-navy">{obs.length}</span>
        <span className="text-[11px] text-slate-400">إجمالي الملاحظات</span>
      </div>
    </div>
  );
}

/** الرسم 3: الخطر × الحالة (Stacked) */
export function RiskStatusStacked({ obs }: { obs: FollowUpObservation[] }) {
  const data = riskByStatus(obs);
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" vertical={false} />
        <XAxis dataKey="risk" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
        <Tooltip contentStyle={tip} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="مغلقة" stackId="a" fill={OBS_STATUS_COLORS["مغلقة"].hex} radius={[0, 0, 0, 0]} />
        <Bar dataKey="لم تغلق" stackId="a" fill={OBS_STATUS_COLORS["لم تغلق"].hex} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** الرسم 2: المفتوحة حسب الإدارة (Horizontal Bar) */
export function OpenByDept({ obs }: { obs: FollowUpObservation[] }) {
  const data = useMemo(() => openByDepartment(obs), [obs]);
  if (data.length === 0) return <EmptyState message="لا توجد ملاحظات مفتوحة ✅" />;
  return (
    // dir=ltr يجعل recharts يعرض أسماء الإدارات بوضوح على اليسار بدل إخفائها تحت الأعمدة
    <div dir="ltr">
      <ResponsiveContainer width="100%" height={Math.max(220, data.length * 34)}>
        <BarChart data={data} layout="vertical" margin={{ right: 12, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="department"
            tick={{ fontSize: 11, textAnchor: "end" }}
            width={170}
            interval={0}
          />
          <Tooltip contentStyle={tip} formatter={(v) => [`${v} مفتوحة`, ""]} />
          <Bar dataKey="open" fill="#ef4444" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** الرسم 4: أعمار الملاحظات المتأخرة (Aging) — CAATs */
export function AgingChart({ obs }: { obs: FollowUpObservation[] }) {
  const rows = useMemo(() => agingList(obs), [obs]);
  const [showAll, setShowAll] = useState(false);
  if (rows.length === 0) return <EmptyState message="لا توجد ملاحظات متأخرة في النطاق المحدد ✅" />;
  const shown = showAll ? rows : rows.slice(0, 18);

  function color(d: number) {
    if (d > 365) return "#991b1b";
    if (d >= 180) return "#ef4444";
    if (d >= 90) return "#f59e0b";
    return "#eab308";
  }
  const data = shown.map((o) => ({
    label: `${o.obsId} · ${o.operationName.replace("مراجعة ", "")}`,
    أيام: o.overdueDays,
    color: color(o.overdueDays),
  }));

  return (
    <div>
      {/* dir=ltr يجعل recharts يعرض معرّف الملاحظة واسم العملية بوضوح على اليسار */}
      <div dir="ltr">
        <ResponsiveContainer width="100%" height={Math.max(240, data.length * 32)}>
          <BarChart data={data} layout="vertical" margin={{ right: 12, left: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis
              type="category"
              dataKey="label"
              tick={{ fontSize: 10, textAnchor: "end" }}
              width={250}
              interval={0}
            />
            <Tooltip contentStyle={tip} formatter={(v) => [`${v} يوم تأخر`, ""]} />
            <Bar dataKey="أيام" radius={[0, 4, 4, 0]}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-between mt-2">
        <div className="flex flex-wrap gap-3 text-[11px] text-slate-500">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: "#991b1b" }} />&gt; 365 يوم</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: "#ef4444" }} />180–365</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: "#f59e0b" }} />90–180</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: "#eab308" }} />&lt; 90</span>
        </div>
        {rows.length > 18 && (
          <button onClick={() => setShowAll((s) => !s)} className="text-sm text-navy font-medium hover:underline">
            {showAll ? "عرض أقل" : `عرض الكل (${rows.length})`}
          </button>
        )}
      </div>
    </div>
  );
}

/** الرسم 5: اتجاه نسبة الإغلاق عبر السنوات */
export function ClosureTrendChart({ all, years }: { all: FollowUpObservation[]; years: number[] }) {
  const data = closureTrend(all, years).map((p) => ({ ...p, year: String(p.year) }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
        <XAxis dataKey="year" tick={{ fontSize: 12 }} />
        <YAxis yAxisId="left" tick={{ fontSize: 11 }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
        <YAxis yAxisId="right" orientation="left" tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip contentStyle={tip} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line yAxisId="left" type="monotone" dataKey="closureRate" name="نسبة الإغلاق %" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
        <Line yAxisId="right" type="monotone" dataKey="total" name="إجمالي الملاحظات" stroke="#1f3864" strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

/** الرسم 6: خريطة حرارية — الإدارة × السنة بنسبة الإغلاق */
export function DeptYearHeatmap({ all, years }: { all: FollowUpObservation[]; years: number[] }) {
  const hm = useMemo(() => deptYearHeatmap(all, years), [all, years]);
  if (hm.departments.length === 0) return <EmptyState message="لا توجد بيانات" />;
  return (
    <div className="overflow-x-auto">
      <div
        className="grid gap-1.5 min-w-[560px]"
        style={{ gridTemplateColumns: `minmax(170px, 1.6fr) repeat(${years.length}, minmax(54px, 1fr))` }}
      >
        <div className="text-xs text-slate-500 font-semibold self-center px-1">الإدارة</div>
        {years.map((y) => (
          <div key={y} className="text-xs text-slate-600 font-semibold nums text-center self-center">
            {y}
          </div>
        ))}
        {hm.departments.map((d) => (
          <Fragment key={d}>
            <div className="text-xs text-slate-700 truncate text-right self-center px-1" title={d}>
              {d}
            </div>
            {years.map((y) => {
              const r = hm.rate[d][y];
              if (r === null)
                return (
                  <div key={y} className="h-8 rounded-md bg-slate-50 flex items-center justify-center text-[10px] text-slate-300">
                    —
                  </div>
                );
              return (
                <div
                  key={y}
                  className="h-8 rounded-md flex items-center justify-center text-[11px] font-bold text-white nums"
                  style={{ backgroundColor: closureColor(r) }}
                  title={`${d} · ${y}: إغلاق ${Math.round(r * 100)}%`}
                >
                  {Math.round(r * 100)}%
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-3 text-[11px] text-slate-500">
        <span>إغلاق منخفض</span>
        <div className="h-2 flex-1 rounded-full max-w-[180px]" style={{ background: "linear-gradient(to left, #ef4444, #f59e0b, #10b981)" }} />
        <span>مرتفع</span>
      </div>
    </div>
  );
}

/** الرسم 8: مصفوفة الأولوية — الخطر × التأخر (Bubble) */
export function PriorityMatrix({ obs }: { obs: FollowUpObservation[] }) {
  const points = useMemo(() => priorityPoints(obs), [obs]);
  if (points.length === 0) return <EmptyState message="لا توجد ملاحظات مفتوحة ✅" />;
  const maxX = Math.max(120, ...points.map((p) => p.x));
  const byType = (["تقنية معلومات", "مالية", "مؤسسية"] as const).map((t) => ({
    type: t,
    data: points.filter((p) => p.type === t),
  })).filter((g) => g.data.length > 0);

  return (
    <div>
      <ResponsiveContainer width="100%" height={320}>
        <ScatterChart margin={{ bottom: 10, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
          {/* منطقة الخطر: خطر عالي + تأخر كبير (أعلى يمين في RTL = y عالي، x كبير) */}
          <ReferenceArea x1={180} x2={maxX} y1={2.5} y2={3.5} fill="#ef4444" fillOpacity={0.08} stroke="#ef4444" strokeOpacity={0.3} strokeDasharray="4 3" />
          <XAxis type="number" dataKey="x" name="أيام التأخر" domain={[0, maxX]} tick={{ fontSize: 11 }} label={{ value: "أيام التأخر", position: "insideBottom", offset: -2, fontSize: 11 }} />
          <YAxis
            type="number"
            dataKey="y"
            name="درجة الخطر"
            domain={[0.5, 3.5]}
            ticks={[1, 2, 3]}
            tickFormatter={(v) => (v === 3 ? "عالي" : v === 2 ? "متوسط" : "منخفض")}
            tick={{ fontSize: 11 }}
          />
          <ZAxis type="number" dataKey="z" range={[60, 360]} name="مرات التأجيل" />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            contentStyle={tip}
            formatter={(value, name) => [value as number, name as string]}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {byType.map((g) => (
            <Scatter key={g.type} name={g.type} data={g.data} fill={TYPE_COLORS[g.type]} fillOpacity={0.7} />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
      <p className="text-[11px] text-slate-500 text-center -mt-1">
        <span className="inline-block w-2.5 h-2.5 rounded-sm align-middle me-1" style={{ background: "#ef444433", border: "1px dashed #ef4444" }} />
        منطقة الخطر (خطر عالٍ + تأخر كبير) = أولوية قصوى للمتابعة · حجم الفقاعة = مرات التأجيل
      </p>
    </div>
  );
}
