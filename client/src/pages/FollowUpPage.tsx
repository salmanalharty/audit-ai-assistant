import { useMemo, useState } from "react";
import {
  ClipboardList,
  Filter,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  PauseCircle,
  ShieldAlert,
  Flame,
  PieChart as PieIcon,
  BarChart3,
  Hourglass,
  TrendingUp,
  Grid3x3,
  Target,
  Building2,
  Repeat,
  CalendarClock,
  Table2,
  RotateCcw,
} from "lucide-react";
import { useAuditStore } from "../store/auditStore";
import { YEARS, AUDIT_TYPES, RISK_LEVELS } from "../types/audit";
import { OBS_STATUSES, FOLLOWUP_CATEGORIES } from "../types/followup";
import type { ObsStatus, FollowUpCategory } from "../types/followup";
import type { AuditType, RiskLevel } from "../types/audit";
import { Card } from "../components/common/Card";
import { KpiCard } from "../components/common/KpiCard";
import { ProgressRing } from "../components/common/ProgressBar";
import { Select } from "../components/common/Select";
import { PageSkeleton } from "../components/common/Skeleton";
import { Hint } from "../components/CAATs/CaatsAnalytics";
import {
  applyFollowFilters,
  departments,
  followKpis,
  type FollowFilters,
} from "../utils/followupCalc";
import { ratio } from "../utils/calculations";
import { formatPercent } from "../utils/format";
import {
  CategoryDonut,
  RiskStatusStacked,
  OpenByDept,
  AgingChart,
  ClosureTrendChart,
  DeptYearHeatmap,
  PriorityMatrix,
} from "../components/FollowUp/Charts";
import { UnjustifiedPanel, RepeatFindings, ChronicDeferral } from "../components/FollowUp/Panels";
import { RegisterTable } from "../components/FollowUp/RegisterTable";

export default function FollowUpPage() {
  const loading = useAuditStore((s) => s.loading);
  const followUp = useAuditStore((s) => s.followUp);

  const [year, setYear] = useState<number | "الكل">("الكل");
  const [type, setType] = useState<AuditType | "الكل">("الكل");
  const [dept, setDept] = useState<string>("الكل");
  const [risk, setRisk] = useState<RiskLevel | "الكل">("الكل");
  const [status, setStatus] = useState<ObsStatus | "الكل">("الكل");
  const [category, setCategory] = useState<FollowUpCategory | "الكل">("الكل");

  const filters: FollowFilters = { year, type, department: dept, risk, status, category };

  const filtered = useMemo(() => applyFollowFilters(followUp, filters), [followUp, filters]);
  // للتحليلات متعددة السنوات: نتجاهل فلتر السنة فقط
  const allYears = useMemo(
    () => applyFollowFilters(followUp, { ...filters, year: "الكل" }),
    [followUp, filters]
  );
  const k = useMemo(() => followKpis(filtered), [filtered]);
  const deptOptions = useMemo(() => departments(followUp), [followUp]);

  function reset() {
    setYear("الكل"); setType("الكل"); setDept("الكل");
    setRisk("الكل"); setStatus("الكل"); setCategory("الكل");
  }

  if (loading || followUp.length === 0) return <PageSkeleton />;

  return (
    <div className="space-y-5">
      {/* العنوان */}
      <div className="flex items-center gap-2">
        <ClipboardList size={22} className="text-gold" />
        <div>
          <h2 className="text-xl font-bold text-navy">تقرير المتابعة</h2>
          <p className="text-sm text-slate-500">
            تتبّع حالة إغلاق ملاحظات المراجعة عبر السنوات (2022–2026) مع تقنيات CAATs لكشف المتأخر والمتكرر وغير المبرر.
          </p>
        </div>
      </div>

      {/* الفلاتر */}
      <Card title="الفلاتر" icon={<Filter size={16} />}>
        <div className="flex flex-wrap items-end gap-3">
          <Select<number | "الكل">
            label="السنة"
            value={year}
            onChange={setYear}
            options={[{ value: "الكل", label: "كل السنوات" }, ...YEARS.map((y) => ({ value: y, label: String(y) }))]}
          />
          <Select<AuditType | "الكل">
            label="نوع المراجعة"
            value={type}
            onChange={setType}
            options={[{ value: "الكل", label: "كل الأنواع" }, ...AUDIT_TYPES.map((t) => ({ value: t, label: t }))]}
          />
          <Select<string>
            label="الإدارة"
            value={dept}
            onChange={setDept}
            options={[{ value: "الكل", label: "كل الإدارات" }, ...deptOptions.map((d) => ({ value: d, label: d }))]}
          />
          <Select<RiskLevel | "الكل">
            label="درجة الخطر"
            value={risk}
            onChange={setRisk}
            options={[{ value: "الكل", label: "كل المستويات" }, ...RISK_LEVELS.map((r) => ({ value: r, label: r }))]}
          />
          <Select<ObsStatus | "الكل">
            label="حالة الملاحظة"
            value={status}
            onChange={setStatus}
            options={[{ value: "الكل", label: "الكل" }, ...OBS_STATUSES.map((s) => ({ value: s, label: s }))]}
          />
          <Select<FollowUpCategory | "الكل">
            label="تصنيف المتابعة"
            value={category}
            onChange={setCategory}
            options={[{ value: "الكل", label: "كل التصنيفات" }, ...FOLLOWUP_CATEGORIES.map((c) => ({ value: c, label: c }))]}
          />
          <button onClick={reset} className="flex items-center gap-1.5 text-sm text-slate-600 border border-slate-300 px-3 py-2 rounded-lg hover:bg-slate-50">
            <RotateCcw size={15} /> إعادة ضبط
          </button>
        </div>
      </Card>

      {/* بطاقات المؤشرات (8) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="إجمالي الملاحظات" value={k.total} icon={<ClipboardList />} accent="#1f3864" />
        <KpiCard label="الملاحظات المغلقة" value={k.closed} sub={`${formatPercent(ratio(k.closed, k.total))} من الإجمالي`} icon={<CheckCircle2 />} accent="#10b981" />
        <KpiCard label="الملاحظات المفتوحة" value={k.open} sub={`${formatPercent(ratio(k.open, k.total))} من الإجمالي`} icon={<XCircle />} accent="#ef4444" />
        <KpiCard label="نسبة الإغلاق العامة">
          <ProgressRing value={k.closureRate} />
        </KpiCard>
        <KpiCard label="الملاحظات المتأخرة" value={k.overdue} icon={<AlertOctagon />} accent="#ef4444" />
        <KpiCard label="الملاحظات المؤجلة" value={k.deferred} icon={<PauseCircle />} accent="#f59e0b" />
        <KpiCard label="ملاحظات غير مبررة" value={k.unjustified} sub="تتطلب تصعيداً" icon={<ShieldAlert />} accent="#dc2626" />
        <KpiCard label="عالية الخطورة مفتوحة" value={k.highRiskOpen} sub="خطر عالٍ ولم تُغلق" icon={<Flame />} accent="#dc2626" />
      </div>

      {/* لوحة غير المبررة */}
      <UnjustifiedPanel obs={filtered} />

      {/* تصنيف + خطر×حالة */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="توزيع الملاحظات حسب تصنيف المتابعة" icon={<PieIcon size={16} />}>
          <Hint>كيف تتوزّع الملاحظات على حالات الإغلاق الخمس — يكشف نسبة المتأخر والمؤجل من المغلق.</Hint>
          <CategoryDonut obs={filtered} />
        </Card>
        <Card title="الملاحظات حسب درجة الخطر × الحالة" icon={<BarChart3 size={16} />}>
          <Hint>هل تُغلق الملاحظات عالية الخطورة بنفس كفاءة المنخفضة؟ كل عمود مقسّم مغلقة/لم تغلق.</Hint>
          <RiskStatusStacked obs={filtered} />
        </Card>
      </div>

      {/* أعمار المتأخرة — عرض كامل */}
      <Card title="تحليل أعمار الملاحظات المتأخرة (CAATs)" icon={<Hourglass size={16} />}>
        <Hint>الملاحظات المفتوحة الأكثر تأخراً أولاً — الملاحظات القديمة (2022–2024) المفتوحة هي الأخطر. اللون يعكس شدّة التأخر.</Hint>
        <AgingChart obs={filtered} />
      </Card>

      {/* الأولوية + المفتوحة حسب الإدارة */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="مصفوفة الأولوية: الخطر × التأخر (CAATs)" icon={<Target size={16} />}>
          <Hint>كل فقاعة ملاحظة مفتوحة؛ منطقة الخطر (أعلى يمين) = خطر عالٍ وتأخر كبير = أولوية قصوى.</Hint>
          <PriorityMatrix obs={filtered} />
        </Card>
        <Card title="الملاحظات المفتوحة حسب الإدارة" icon={<Building2 size={16} />}>
          <Hint>الإدارات الأكثر تراكماً للملاحظات المفتوحة أولاً — لتوجيه جهد المتابعة.</Hint>
          <OpenByDept obs={filtered} />
        </Card>
      </div>

      {/* الملاحظات المتكررة — عرض كامل */}
      <Card title="كاشف الملاحظات المتكررة (CAATs)" icon={<Repeat size={16} />}>
        <Hint>ملاحظات بنفس العنوان تكرّرت لنفس العملية عبر سنوات متعددة — مؤشر على فشل رقابي نظامي لم يُعالَج جذرياً.</Hint>
        <RepeatFindings all={allYears} />
      </Card>

      {/* اتجاه الإغلاق + الخريطة الحرارية */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="اتجاه نسبة الإغلاق عبر السنوات (CAATs)" icon={<TrendingUp size={16} />}>
          <Hint>هل أداء إغلاق الملاحظات يتحسّن أم يتراجع؟ الخط الأخضر = نسبة الإغلاق، المنقّط = إجمالي الملاحظات.</Hint>
          <ClosureTrendChart all={allYears} years={[...YEARS]} />
        </Card>
        <Card title="الإغلاق حسب الإدارة × السنة (CAATs)" icon={<Grid3x3 size={16} />}>
          <Hint>خريطة حرارية لنسبة الإغلاق — تكشف فوراً الإدارات/السنوات ذات الإغلاق الضعيف (أحمر).</Hint>
          <DeptYearHeatmap all={allYears} years={[...YEARS]} />
        </Card>
      </div>

      {/* التأجيل المزمن */}
      <Card title="تحليل التأجيل المزمن (CAATs)" icon={<CalendarClock size={16} />}>
        <Hint>ملاحظات أُجّل موعد إغلاقها مرتين أو أكثر — مؤشر على تهرّب أو عجز عن التنفيذ.</Hint>
        <ChronicDeferral obs={filtered} />
      </Card>

      {/* سجل المتابعة الكامل */}
      <Card title="سجل المتابعة الكامل" icon={<Table2 size={16} />}>
        <Hint>جميع الأعمدة الـ17 لكل ملاحظة — قابل للفرز والبحث والتصدير. عمودا المعرّف والعنوان مثبّتان أثناء التمرير.</Hint>
        <RegisterTable obs={filtered} />
      </Card>
    </div>
  );
}
