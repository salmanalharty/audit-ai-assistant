import { useMemo, useState } from "react";
import {
  GitCompareArrows,
  TrendingUp,
  Grid3x3,
  GitCompare,
  Timer,
  Layers,
  ScatterChart as ScatterIcon,
  Award,
  Map,
  ScanSearch,
  Filter,
} from "lucide-react";
import { useAuditStore, applyFilters } from "../store/auditStore";
import type { TypeFilter, QuarterFilter } from "../store/auditStore";
import { YEARS, AUDIT_TYPES, QUARTERS } from "../types/audit";
import type { AuditYear, Quarter } from "../types/audit";
import { Card } from "../components/common/Card";
import { Select } from "../components/common/Select";
import { PageSkeleton } from "../components/common/Skeleton";
import { MultiYearComparison } from "../components/Comparison/MultiYearComparison";
import {
  Hint,
  TrendForecast,
  YoYVariance,
  PlannedVsActual,
  AgingAnalysis,
  RiskStratification,
  RiskDistribution,
  DepartmentScorecard,
  CoverageMatrix,
  AnomalyDetection,
} from "../components/CAATs/CaatsAnalytics";

export default function ComparisonPage() {
  const data = useAuditStore((s) => s.data);
  const loading = useAuditStore((s) => s.loading);

  // فلاتر علوية عامة (للتحليلات المفردة على سنة واحدة)
  const [year, setYear] = useState<AuditYear>(2025);
  const [type, setType] = useState<TypeFilter>("الكل");
  const [quarter, setQuarter] = useState<QuarterFilter>("الكل");

  const yearOps = data ? data[year] : [];
  const filtered = useMemo(
    () => applyFilters(yearOps, { type, status: "الكل", risk: "الكل", quarter, search: "" }),
    [yearOps, type, quarter]
  );

  if (loading || !data) return <PageSkeleton />;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-navy">المقارنة والتحليل</h2>
        <p className="text-sm text-slate-500">مقارنة 5 سنوات (2022–2026) وتقنيات CAATs لدعم القرار</p>
      </div>

      {/* (1) فلاتر علوية عامة */}
      <Card title="الفلاتر العامة" icon={<Filter size={16} />}>
        <Hint>تتحكم هذه الفلاتر في التحليلات التي تعتمد على سنة واحدة (المخطط/الفعلي، الأعمار، الشرائح، الارتباط، أداء الإدارات).</Hint>
        <div className="flex flex-wrap items-end gap-3">
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
      </Card>

      {/* (2) المقارنة متعددة السنوات */}
      <Card title="المقارنة متعددة السنوات" icon={<GitCompareArrows size={16} />}>
        <Hint>قارن مؤشرات العمليات عبر سنتين أو أكثر. أضف/احذف السنوات؛ يتحوّل الرسم تلقائياً إلى خطّي عند 3 سنوات فأكثر.</Hint>
        <MultiYearComparison data={data} />
      </Card>

      {/* (3) اتجاه 5 سنوات + تنبؤ */}
      <Card title="الاتجاه عبر 5 سنوات + تنبؤ" icon={<TrendingUp size={16} />}>
        <Hint>تطوّر المؤشر عبر السنوات مع توقّع السنة القادمة — يكشف هل المخاطر والملاحظات تتحسّن أم تتدهور.</Hint>
        <TrendForecast data={data} />
      </Card>

      {/* (4) مصفوفة التغير السنوي */}
      <Card title="مصفوفة التغير السنوي (YoY)" icon={<Grid3x3 size={16} />}>
        <Hint>نسبة/مقدار التغيّر لكل عملية بين كل سنتين متتاليتين. أخضر = تحسّن، أحمر = تدهور، وشدّة اللون تعكس حجم التغيّر.</Hint>
        <YoYVariance data={data} />
      </Card>

      {/* (5) المخطط مقابل الفعلي */}
      <Card title={`المخطط مقابل الفعلي — ${year}`} icon={<GitCompare size={16} />}>
        <Hint>يقارن المدة المخططة بالفعلية لكل عملية؛ العمليات التي تجاوزت المخطط مميّزة بالأحمر مع خط متوسط المخطط.</Hint>
        <PlannedVsActual ops={filtered} />
      </Card>

      {/* (6) الأعمار والتأخير */}
      <Card title={`تحليل الأعمار والتأخير — ${year}`} icon={<Timer size={16} />}>
        <Hint>العمليات المتأخرة مرتّبة بأيام التأخير (من عمود «عدد الأيام المتأخرة»). تُستبعد «لم تبدأ» و«مؤجلة».</Hint>
        <AgingAnalysis ops={filtered} />
      </Card>

      {/* (7) التقسيم الطبقي للمخاطر */}
      <Card title={`التقسيم الطبقي للمخاطر — ${year}`} icon={<Layers size={16} />}>
        <Hint>توزيع العمليات على ثلاث شرائح خطورة مع عدد غير المكتمل في كل شريحة ورؤية تحليلية تلقائية.</Hint>
        <RiskStratification ops={filtered} />
      </Card>

      {/* (8) تحليل الارتباط */}
      <Card title={`الارتباط: المخاطر مقابل الملاحظات — ${year}`} icon={<ScatterIcon size={16} />}>
        <Hint>هل العمليات عالية الخطورة ترصد ملاحظات أكثر؟ الفقاعات بحدود متقطّعة حمراء = مخاطر عالية بملاحظات قليلة (مراجعة سطحية محتملة).</Hint>
        <RiskDistribution ops={filtered} />
      </Card>

      {/* (9) أداء الإدارات */}
      <Card title={`بطاقة أداء الإدارات — ${year}`} icon={<Award size={16} />}>
        <Hint>مؤشر مركّب لكل إدارة (الإنجاز + إغلاق التوصيات + عكس نسبة الملاحظات الحرجة) من 100، مرتّب من الأعلى أداءً.</Hint>
        <DepartmentScorecard ops={filtered} />
      </Card>

      {/* (10) تغطية مجتمع المراجعة */}
      <Card title="تغطية مجتمع المراجعة" icon={<Map size={16} />}>
        <Hint>أي الإدارات رُوجعت في أي سنة عبر 2022–2026، مرتّبة من الأقل تغطية لإبراز الفجوات.</Hint>
        <CoverageMatrix data={data} />
      </Card>

      {/* (11) كاشف الشذوذ */}
      <Card title={`كاشف الشذوذ (CAATs) — ${year}`} icon={<ScanSearch size={16} />}>
        <Hint>حالات شاذة في البيانات قد تستدعي المراجعة (مكتملة بلا ملاحظات، تناقض الحالة مع الإنجاز، إلخ).</Hint>
        <AnomalyDetection ops={filtered} />
      </Card>
    </div>
  );
}
