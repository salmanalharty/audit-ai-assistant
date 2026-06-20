import { Fragment, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ArrowUp, ArrowDown, Minus, Plus, X } from "lucide-react";
import type { AuditDataByYear, AuditYear } from "../../types/audit";
import { YEARS } from "../../types/audit";
import { Select } from "../common/Select";
import { OP_METRICS, fmtMetric, chartValue, type OpMetric } from "../../utils/metrics";

const YEAR_COLORS: Record<number, string> = {
  2022: "#94a3b8",
  2023: "#c9a94e",
  2024: "#3b82f6",
  2025: "#1f3864",
  2026: "#10b981",
};

function Delta({ a, b, metric }: { a: number; b: number; metric: OpMetric }) {
  const diff = b - a;
  if (Math.abs(diff) < 0.0001)
    return (
      <span className="inline-flex items-center gap-0.5 text-slate-400 text-xs">
        <Minus size={12} /> 0
      </span>
    );
  const improved = metric.goodWhenUp ? diff > 0 : diff < 0;
  const color = improved ? "#10b981" : "#ef4444";
  const Arrow = diff > 0 ? ArrowUp : ArrowDown;
  const shown = metric.isPercent ? `${Math.round(Math.abs(diff) * 100)}%` : Math.abs(diff);
  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-medium" style={{ color }}>
      <Arrow size={12} />
      <span className="nums">{shown}</span>
    </span>
  );
}

export function MultiYearComparison({ data }: { data: AuditDataByYear }) {
  const [years, setYears] = useState<AuditYear[]>([2024, 2025]);
  const [metric, setMetric] = useState<OpMetric>(OP_METRICS[0]);
  const [hidden, setHidden] = useState<number[]>([]);

  const sortedYears = useMemo(() => [...years].sort((a, b) => a - b), [years]);
  const available = YEARS.filter((y) => !years.includes(y));

  // أسماء العمليات (اتحاد عبر السنوات المختارة)
  const names = useMemo(() => {
    const set = new Set<string>();
    for (const y of sortedYears) for (const o of data[y] || []) set.add(o.name);
    return Array.from(set);
  }, [data, sortedYears]);

  // بيانات الرسم: لكل عملية قيمة المؤشر في كل سنة
  const chartData = useMemo(
    () =>
      names.map((name) => {
        const row: Record<string, number | string> = { name: name.replace("مراجعة ", "") };
        for (const y of sortedYears) {
          const op = (data[y] || []).find((o) => o.name === name);
          if (op) row[String(y)] = chartValue(op[metric.key] as number, metric);
        }
        return row;
      }),
    [names, sortedYears, data, metric]
  );

  function addYear(y: AuditYear) {
    if (!years.includes(y)) setYears([...years, y]);
  }
  function removeYear(y: AuditYear) {
    if (years.length > 2) setYears(years.filter((x) => x !== y));
  }
  function toggleHidden(y: number) {
    setHidden((h) => (h.includes(y) ? h.filter((x) => x !== y) : [...h, y]));
  }

  const isLine = sortedYears.length >= 3;

  return (
    <div className="space-y-4">
      {/* اختيار السنوات */}
      <div className="flex flex-wrap items-center gap-2">
        {sortedYears.map((y) => (
          <span
            key={y}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-white"
            style={{ backgroundColor: YEAR_COLORS[y] }}
          >
            <span className="nums">{y}</span>
            {years.length > 2 && (
              <button onClick={() => removeYear(y)} className="hover:bg-white/25 rounded p-0.5">
                <X size={13} />
              </button>
            )}
          </span>
        ))}
        {available.length > 0 && (
          <div className="inline-flex items-center gap-1">
            {available.map((y) => (
              <button
                key={y}
                onClick={() => addYear(y)}
                className="inline-flex items-center gap-1 rounded-lg border border-dashed border-slate-300 px-2.5 py-1.5 text-xs text-slate-500 hover:border-navy hover:text-navy"
              >
                <Plus size={13} />
                <span className="nums">{y}</span>
              </button>
            ))}
          </div>
        )}
        <div className="ms-auto">
          <Select<string>
            label="المؤشر في الرسم"
            value={metric.key}
            onChange={(k) => setMetric(OP_METRICS.find((m) => m.key === k) ?? OP_METRICS[0])}
            options={OP_METRICS.map((m) => ({ value: m.key, label: m.label }))}
          />
        </div>
      </div>

      {/* الرسم */}
      <ResponsiveContainer width="100%" height={320}>
        {isLine ? (
          <LineChart data={chartData} margin={{ bottom: 70 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} onClick={(e) => toggleHidden(Number(e.dataKey))} />
            {sortedYears.map((y) => (
              <Line
                key={y}
                type="monotone"
                dataKey={String(y)}
                stroke={YEAR_COLORS[y]}
                strokeWidth={2.5}
                dot={{ r: 2 }}
                hide={hidden.includes(y)}
                connectNulls
              />
            ))}
          </LineChart>
        ) : (
          <BarChart data={chartData} margin={{ bottom: 70 }} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} onClick={(e) => toggleHidden(Number(e.dataKey))} />
            {sortedYears.map((y) => (
              <Bar
                key={y}
                dataKey={String(y)}
                fill={YEAR_COLORS[y]}
                radius={[3, 3, 0, 0]}
                hide={hidden.includes(y)}
              />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
      <p className="text-[11px] text-slate-400 text-center -mt-2">
        اضغط على سنة في المفتاح لإظهار/إخفاء خطها · {isLine ? "عرض خطي (3 سنوات أو أكثر)" : "عرض أعمدة (سنتان)"}
      </p>

      {/* جدول المقارنة جنباً لجنب (كل المؤشرات × السنوات المختارة + الفرق) */}
      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-sm whitespace-nowrap border-separate border-spacing-0 [&_th]:border-l [&_th]:border-b [&_th]:border-slate-200/70 [&_td]:border-l [&_td]:border-b [&_td]:border-slate-100">
          <thead>
            <tr className="bg-navy-50 text-navy text-xs">
              <th rowSpan={2} className="text-right font-semibold py-2.5 px-3 align-bottom sticky right-0 z-20 bg-navy-50">
                العملية
              </th>
              {OP_METRICS.map((m) => (
                <th key={m.key} colSpan={sortedYears.length + 1} className="text-center font-semibold py-2 px-2">
                  {m.label}
                </th>
              ))}
            </tr>
            <tr className="bg-navy-50/60 text-slate-500 text-[11px]">
              {OP_METRICS.map((m) => (
                <Fragment key={m.key}>
                  {sortedYears.map((y) => (
                    <th key={m.key + y} className="py-1 px-2 nums">
                      {y}
                    </th>
                  ))}
                  <th className="py-1 px-2">الفرق</th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {names.map((name) => (
              <tr key={name} className="hover:bg-slate-50">
                <td className="py-2.5 px-3 font-medium text-slate-800 sticky right-0 z-10 bg-white">
                  {name}
                </td>
                {OP_METRICS.map((m) => {
                  const first = (data[sortedYears[0]] || []).find((o) => o.name === name);
                  const last = (data[sortedYears[sortedYears.length - 1]] || []).find((o) => o.name === name);
                  return (
                    <Fragment key={m.key}>
                      {sortedYears.map((y) => {
                        const op = (data[y] || []).find((o) => o.name === name);
                        return (
                          <td key={m.key + y} className="py-2.5 px-2 nums text-center text-slate-700">
                            {op ? (
                              fmtMetric(op[m.key] as number, m)
                            ) : (
                              <span className="text-slate-300 text-[11px]">غير مدرجة</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="py-2.5 px-2 text-center">
                        {first && last ? (
                          <Delta a={first[m.key] as number} b={last[m.key] as number} metric={m} />
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    </Fragment>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-slate-400">
        عمود «الفرق» يقارن السنة الأولى ({sortedYears[0]}) بالأخيرة ({sortedYears[sortedYears.length - 1]}).
        السهم الأخضر = تحسّن، الأحمر = تراجع (وفق طبيعة كل مؤشر). مرّر أفقياً لرؤية كل المؤشرات.
      </p>
    </div>
  );
}
