import { useMemo } from "react";
import {
  CheckCircle2,
  Loader2,
  AlertOctagon,
  ListChecks,
  BellRing,
  Map,
  TimerOff,
  Layers,
  CalendarRange,
} from "lucide-react";
import { useAuditStore, selectYearOps, applyFilters } from "../store/auditStore";
import { kpiSummary, ratio, lateOps } from "../utils/calculations";
import { Card } from "../components/common/Card";
import { KpiCard } from "../components/common/KpiCard";
import { ProgressRing } from "../components/common/ProgressBar";
import { PageSkeleton } from "../components/common/Skeleton";
import { formatPercent } from "../utils/format";
import { GlobalFilters } from "../components/common/GlobalFilters";
import {
  TypeDonut,
  StatusDonut,
  YearsBar,
  PhaseDonut,
  QuarterBar,
} from "../components/Dashboard/Charts";
import { RiskHeatMap } from "../components/Dashboard/RiskHeatMap";
import { SmartAlerts } from "../components/Dashboard/SmartAlerts";
import { RecentAuditsTable } from "../components/Dashboard/RecentAuditsTable";

export default function DashboardPage() {
  const data = useAuditStore((s) => s.data);
  const loading = useAuditStore((s) => s.loading);
  const yearOps = useAuditStore(selectYearOps);
  const year = useAuditStore((s) => s.year);
  const type = useAuditStore((s) => s.type);
  const status = useAuditStore((s) => s.status);
  const quarter = useAuditStore((s) => s.quarter);
  const search = useAuditStore((s) => s.search);

  const ops = useMemo(
    () => applyFilters(yearOps, { type, status, risk: "الكل", quarter, search }),
    [yearOps, type, status, quarter, search]
  );
  const k = useMemo(() => kpiSummary(ops), [ops]);
  const lateCount = useMemo(() => lateOps(ops).length, [ops]);

  if (loading || !data) return <PageSkeleton />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-navy">لوحة التحكم</h2>
          <p className="text-sm text-slate-500">
            نظرة شاملة على خطة المراجعة لسنة <span className="nums">{year}</span>
          </p>
        </div>
      </div>

      <GlobalFilters />

      {/* بطاقات المؤشرات */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <KpiCard label="نسبة الإنجاز الإجمالية">
          <ProgressRing value={k.overall} />
        </KpiCard>
        <KpiCard
          label="مكتملة"
          value={k.completed}
          sub={`${formatPercent(ratio(k.completed, k.total))} من الإجمالي`}
          icon={<CheckCircle2 />}
          accent="#10b981"
        />
        <KpiCard
          label="تحت التنفيذ"
          value={k.inProgress}
          sub={`${formatPercent(ratio(k.inProgress, k.total))} من الإجمالي`}
          icon={<Loader2 />}
          accent="#3b82f6"
        />
        <KpiCard
          label="متأخرة + لم تبدأ"
          value={k.late + k.notStarted}
          sub={`متأخرة ${k.late} · لم تبدأ ${k.notStarted}`}
          icon={<AlertOctagon />}
          accent="#f59e0b"
        />
        <KpiCard
          label="العمليات المتأخرة"
          value={lateCount}
          sub="عدد أيام التأخير أكبر من صفر"
          icon={<TimerOff />}
          accent="#ef4444"
        />
      </div>

      {/* الرسوم */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="توزيع العمليات حسب النوع">
          <TypeDonut ops={ops} />
        </Card>
        <Card title="توزيع العمليات حسب الحالة">
          <StatusDonut ops={ops} />
        </Card>
        <Card title="توزيع العمليات حسب المرحلة" icon={<Layers size={16} />}>
          <PhaseDonut ops={ops} />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="توزيع العمليات حسب الربع السنوي" icon={<CalendarRange size={16} />}>
          <QuarterBar ops={ops} />
        </Card>
        <Card title="مقارنة السنوات — إجمالي العمليات">
          <YearsBar data={data} />
        </Card>
      </div>

      {/* خريطة المخاطر + التنبيهات */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="خريطة المخاطر الحرارية" icon={<Map size={16} />} className="lg:col-span-2">
          <RiskHeatMap ops={ops} />
        </Card>
        <Card title="التنبيهات الذكية" icon={<BellRing size={16} />}>
          <SmartAlerts ops={ops} />
        </Card>
      </div>

      {/* أحدث العمليات */}
      <Card title="أحدث العمليات" icon={<ListChecks size={16} />}>
        <RecentAuditsTable ops={ops} />
      </Card>
    </div>
  );
}
