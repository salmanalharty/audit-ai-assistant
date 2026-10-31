import { useEffect, useMemo, useState } from "react";
import {
  ListChecks,
  Filter,
  RotateCcw,
  Search,
  ClipboardCheck,
  Activity,
  CheckCircle2,
  ArrowUpCircle,
  AlertOctagon,
  CalendarClock,
  Lightbulb,
  History,
  Table2,
  Trash2,
  Database,
  FileScan,
  Users,
} from "lucide-react";
import { useAuditStore } from "../store/auditStore";
import { useActionsStore } from "../store/actionsStore";
import { YEARS, RISK_LEVELS } from "../types/audit";
import type { RiskLevel } from "../types/audit";
import { ACTION_STATES } from "../types/actions";
import type { ActionKind, ActionState } from "../types/actions";
import type { EvidenceDecision } from "../types/evidence";
import type { EffectiveAction } from "../utils/workflow";
import { Card } from "../components/common/Card";
import { KpiCard } from "../components/common/KpiCard";
import { ProgressRing } from "../components/common/ProgressBar";
import { Select } from "../components/common/Select";
import { PageSkeleton } from "../components/common/Skeleton";
import { Hint } from "../components/CAATs/CaatsAnalytics";
import { departments } from "../utils/followupCalc";
import { effectiveActions, suggestions, workflowKpis } from "../utils/workflow";
import { formatPercent } from "../utils/format";
import { ActionsToolbar } from "../components/Actions/ActionsToolbar";
import { ActionsTable } from "../components/Actions/ActionsTable";
import { ActionDialog } from "../components/Actions/ActionDialog";
import { EmailDraftModal } from "../components/Actions/EmailDraftModal";
import { ExtractPanel } from "../components/Actions/ExtractPanel";
import { EvidenceModal } from "../components/Actions/EvidenceModal";
import { SuggestionsPanel } from "../components/Actions/SuggestionsPanel";
import { ActivityLog } from "../components/Actions/ActivityLog";
import { DigestPanel } from "../components/Actions/DigestPanel";

export default function ActionsPage() {
  const loading = useAuditStore((s) => s.loading);
  const followUp = useAuditStore((s) => s.followUp);

  const records = useActionsStore((s) => s.records);
  const events = useActionsStore((s) => s.events);
  const imported = useActionsStore((s) => s.imported);
  const storage = useActionsStore((s) => s.storage);
  const hydrate = useActionsStore((s) => s.hydrate);
  const remind = useActionsStore((s) => s.remind);
  const escalate = useActionsStore((s) => s.escalate);
  const closeAction = useActionsStore((s) => s.close);
  const extend = useActionsStore((s) => s.extend);
  const reopen = useActionsStore((s) => s.reopen);
  const recordEvidence = useActionsStore((s) => s.recordEvidence);
  const resetAll = useActionsStore((s) => s.resetAll);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  // تاريخ مرجعي ثابت طوال عمر الصفحة — حتى لا تتغيّر الحسابات أثناء التصفح
  const today = useMemo(() => new Date(), []);

  const [year, setYear] = useState<number | "الكل">("الكل");
  const [dept, setDept] = useState<string>("الكل");
  const [risk, setRisk] = useState<RiskLevel | "الكل">("الكل");
  const [state, setState] = useState<ActionState | "الكل">("الكل");
  const [search, setSearch] = useState("");

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<ActionKind | null>(null);
  // نحتفظ بالمعرّفات فقط، فتُقرأ صفوف المسودة بعد تطبيق الإجراء (موعد جديد/حالة جديدة)
  const [draft, setDraft] = useState<{ kind: ActionKind; ids: string[] } | null>(null);
  const [evidenceRow, setEvidenceRow] = useState<EffectiveAction | null>(null);

  // ملاحظات الإكسل + الملاحظات المستخرجة من تقارير PDF
  const merged = useMemo(() => [...followUp, ...imported], [followUp, imported]);
  const importedIds = useMemo(() => new Set(imported.map((o) => o.obsId)), [imported]);

  const all = useMemo(
    () => effectiveActions(merged, records, today),
    [merged, records, today]
  );

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((a) => {
      const o = a.obs;
      if (year !== "الكل" && o.year !== year) return false;
      if (dept !== "الكل" && o.department !== dept) return false;
      if (risk !== "الكل" && o.riskLevel !== risk) return false;
      if (state !== "الكل" && a.state !== state) return false;
      if (q) {
        const hay = `${o.obsId} ${o.title} ${o.recommendation} ${o.department} ${o.responsible}`;
        if (!hay.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [all, year, dept, risk, state, search]);

  // لا يبقى محدَّداً إلا ما هو ظاهر فعلاً — حتى لا يُنفَّذ إجراء على صف مخفي
  useEffect(() => {
    setSelected((prev) => {
      if (prev.size === 0) return prev;
      const visible = new Set(rows.map((r) => r.obs.obsId));
      const next = new Set<string>();
      prev.forEach((id) => visible.has(id) && next.add(id));
      return next.size === prev.size ? prev : next;
    });
  }, [rows]);

  const k = useMemo(() => workflowKpis(rows), [rows]);
  const sugg = useMemo(() => suggestions(rows), [rows]);
  const deptOptions = useMemo(() => departments(merged), [merged]);
  const selectedRows = useMemo(
    () => rows.filter((a) => selected.has(a.obs.obsId)),
    [rows, selected]
  );
  // من `all` لا من `rows`: الصف قد يخرج من الفلتر بعد تنفيذ الإجراء (إغلاق مثلاً)
  const draftRows = useMemo(
    () => (draft ? all.filter((a) => draft.ids.includes(a.obs.obsId)) : []),
    [draft, all]
  );

  function toggle(obsId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(obsId) ? next.delete(obsId) : next.add(obsId);
      return next;
    });
  }

  function togglePage(obsIds: string[], select: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      obsIds.forEach((id) => (select ? next.add(id) : next.delete(id)));
      return next;
    });
  }

  function confirmAction(ids: string[], newDueDate?: Date, withEmail?: boolean) {
    const kind = pending;
    switch (pending) {
      case "تذكير":
        remind(ids);
        break;
      case "تصعيد":
        escalate(ids);
        break;
      case "إغلاق":
        closeAction(ids);
        break;
      case "إعادة فتح":
        reopen(ids);
        break;
      case "تمديد":
        if (newDueDate) extend(ids, newDueDate);
        break;
    }
    setPending(null);
    setSelected(new Set());
    if (kind && withEmail && ids.length > 0) setDraft({ kind, ids });
  }

  /**
   * قرار المراجع بعد قراءة تقييم الأدلة. التقييم نفسه يُسجَّل دائماً في سجل
   * التدقيق، ثم يُنفَّذ ما اختاره المراجع — ولا شيء يحدث تلقائياً قبل ذلك.
   */
  function handleEvidenceDecision(decision: EvidenceDecision, note: string) {
    if (!evidenceRow) return;
    const id = evidenceRow.obs.obsId;
    recordEvidence(id, note);

    if (decision === "close") {
      closeAction([id]);
      setDraft({ kind: "إغلاق", ids: [id] });
    } else if (decision === "request") {
      remind([id]);
      setDraft({ kind: "تذكير", ids: [id] });
    }

    setEvidenceRow(null);
  }

  function resetFilters() {
    setYear("الكل");
    setDept("الكل");
    setRisk("الكل");
    setState("الكل");
    setSearch("");
  }

  async function handleReset() {
    const ok = window.confirm(
      `سيُحذف ${events.length} حدثاً و${imported.length} ملاحظة مستوردة وكل تغييرات الحالة التي نفّذتها، وتعود البيانات كما في ملف الإكسل. هل تريد المتابعة؟`
    );
    if (ok) {
      await resetAll();
      setSelected(new Set());
    }
  }

  if (loading || followUp.length === 0) return <PageSkeleton />;

  return (
    <div className="space-y-5">
      {/* العنوان */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <ListChecks size={22} className="text-gold" />
          <div>
            <h2 className="text-xl font-bold text-navy">الإجراءات التصحيحية</h2>
            <p className="text-sm text-slate-500">
              متابعة تنفيذ الإجراءات التصحيحية: تذكير، تمديد، تصعيد، وإغلاق — بقواعد حتمية، مع
              فحص أدلة الإغلاق وسجل تدقيق كامل.
            </p>
          </div>
        </div>
        {events.length > 0 && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-sm text-red-600 border border-red-200 bg-red-50/60 px-3 py-2 rounded-lg hover:bg-red-50"
          >
            <Trash2 size={15} /> تصفير الإجراءات
          </button>
        )}
      </div>

      {/* تنويه التخزين — يعكس الخلفية المكتشفة فعلاً */}
      <div
        className={`flex items-start gap-2.5 text-xs rounded-xl px-4 py-3 border ${
          storage === "shared"
            ? "text-emerald-900 bg-emerald-50/70 border-emerald-200"
            : "text-slate-600 bg-navy-50/60 border-navy/10"
        }`}
      >
        {storage === "shared" ? (
          <Users size={15} className="text-emerald-700 shrink-0 mt-0.5" />
        ) : (
          <Database size={15} className="text-navy shrink-0 mt-0.5" />
        )}
        <p className="leading-relaxed">
          {storage === "shared" ? (
            <>
              التخزين <strong>مشترك</strong>: الإجراءات التي تنفّذها يراها كل من يفتح الموقع، ولا
              تُعدِّل ملف الإكسل الأصلي — فهو يبقى مصدر الحقيقة.
            </>
          ) : (
            <>
              الإجراءات التي تنفّذها تُحفظ في <strong>متصفحك أنت</strong> ولا تُعدِّل ملف الإكسل
              الأصلي — فهو يبقى مصدر الحقيقة. صفحة «تقرير المتابعة» تعرض البيانات الأصلية دون
              تأثّر، وهذه الصفحة تعرضها بعد دمج إجراءاتك.
            </>
          )}
        </p>
      </div>

      <DigestPanel onSelect={(ids) => setSelected(new Set(ids))} />

      {/* الفلاتر */}
      <Card title="الفلاتر" icon={<Filter size={16} />}>
        <div className="flex flex-wrap items-end gap-3">
          <Select<number | "الكل">
            label="السنة"
            value={year}
            onChange={setYear}
            options={[
              { value: "الكل", label: "كل السنوات" },
              ...YEARS.map((y) => ({ value: y, label: String(y) })),
            ]}
          />
          <Select<string>
            label="الإدارة"
            value={dept}
            onChange={setDept}
            options={[
              { value: "الكل", label: "كل الإدارات" },
              ...deptOptions.map((d) => ({ value: d, label: d })),
            ]}
          />
          <Select<RiskLevel | "الكل">
            label="درجة الخطر"
            value={risk}
            onChange={setRisk}
            options={[
              { value: "الكل", label: "كل المستويات" },
              ...RISK_LEVELS.map((r) => ({ value: r, label: r })),
            ]}
          />
          <Select<ActionState | "الكل">
            label="حالة الإجراء"
            value={state}
            onChange={setState}
            options={[
              { value: "الكل", label: "كل الحالات" },
              ...ACTION_STATES.map((s) => ({ value: s, label: s })),
            ]}
          />
          <label className="flex flex-col gap-1 text-sm flex-1 min-w-[200px]">
            <span className="text-slate-500 text-xs">بحث</span>
            <div className="relative">
              <Search
                size={15}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="المعرّف، العنوان، الإجراء، الإدارة، المسؤول…"
                className="w-full bg-white border border-slate-300 rounded-lg pr-9 pl-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy/30"
              />
            </div>
          </label>
          <button
            onClick={resetFilters}
            className="flex items-center gap-1.5 text-sm text-slate-600 border border-slate-300 px-3 py-2 rounded-lg hover:bg-slate-50"
          >
            <RotateCcw size={15} /> إعادة ضبط
          </button>
        </div>
      </Card>

      {/* المؤشرات الحية */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="إجمالي الإجراءات التصحيحية"
          value={k.total}
          icon={<ClipboardCheck />}
          accent="#1f3864"
        />
        <KpiCard label="قيد التنفيذ" value={k.inProgress} icon={<Activity />} accent="#3b82f6" />
        <KpiCard
          label="مغلقة"
          value={k.closed}
          sub={`${formatPercent(k.closureRate)} من الإجمالي`}
          icon={<CheckCircle2 />}
          accent="#10b981"
        />
        <KpiCard label="نسبة الإغلاق">
          <ProgressRing value={k.closureRate} />
        </KpiCard>
        <KpiCard
          label="مصعّدة"
          value={k.escalated}
          sub="معروضة على الإدارة العليا"
          icon={<ArrowUpCircle />}
          accent="#dc2626"
        />
        <KpiCard
          label="متأخرة"
          value={k.delayed}
          sub="تجاوزت موعد الإغلاق"
          icon={<AlertOctagon />}
          accent="#ef4444"
        />
        <KpiCard
          label="مستحقة قريباً"
          value={k.dueSoon}
          sub="خلال 90 يوماً ولم تتأخر"
          icon={<CalendarClock />}
          accent="#f59e0b"
        />
        <KpiCard
          label="غير مبررة"
          value={k.unjustified}
          sub="مفتوحة بلا مبرر مقبول"
          icon={<AlertOctagon />}
          accent="#b91c1c"
        />
      </div>

      {/* استخراج الملاحظات من تقرير PDF */}
      <Card title="استخراج الملاحظات من تقرير مراجعة (PDF)" icon={<FileScan size={16} />}>
        <Hint>
          هنا يعمل الذكاء الاصطناعي فعلاً: يقرأ تقرير المراجعة ويستخرج الملاحظات والإجراءات
          التصحيحية. المخرَج <strong>مقترَح لا معتمَد</strong> — مع كل ملاحظة اقتباس حرفي من
          التقرير ورقم صفحته ودرجة ثقة، ولا تدخل السجل إلا باعتمادك.
        </Hint>
        <ExtractPanel />
      </Card>

      {/* اقتراحات المحرك */}
      <Card title="اقتراحات محرك المتابعة" icon={<Lightbulb size={16} />}>
        <Hint>
          قواعد حتمية تُطبَّق على البيانات المعروضة — لا دخل للذكاء الاصطناعي فيها، ولذلك تعطي نفس
          النتيجة في كل مرة وتبقى قابلة للتدقيق. اضغط «حدِّد» لنقل الملاحظات إلى شريط الإجراءات.
        </Hint>
        <SuggestionsPanel items={sugg} onSelect={(ids) => setSelected(new Set(ids))} />
      </Card>

      {/* شريط الإجراءات + الجدول */}
      <Card title="سجل الإجراءات التصحيحية" icon={<Table2 size={16} />}>
        <Hint>
          حدِّد ملاحظة أو أكثر ثم اختر الإجراء. كل إجراء يمرّ بنافذة مراجعة قبل التنفيذ، ويُسجَّل في
          سجل التدقيق أدناه. وزر <strong>الدرع</strong> في آخر كل صف يفتح فحص كفاية أدلة الإغلاق.
        </Hint>
        <div className="sticky top-0 z-30 -mx-5 px-5 py-3 mb-3 bg-white/95 backdrop-blur border-b border-slate-100">
          <ActionsToolbar
            selectedCount={selected.size}
            onAction={setPending}
            onClearSelection={() => setSelected(new Set())}
          />
        </div>
        <ActionsTable
          rows={rows}
          selected={selected}
          importedIds={importedIds}
          onToggle={toggle}
          onTogglePage={togglePage}
          onCheckEvidence={setEvidenceRow}
        />
      </Card>

      {/* سجل التدقيق */}
      <Card title="سجل التدقيق" icon={<History size={16} />}>
        <Hint>
          كل إجراء يُسجَّل بوقته ومنفّذه ووصف أثره — وهو ما يجعل الأتمتة مقبولة في بيئة المراجعة
          الداخلية.
        </Hint>
        <ActivityLog events={events} />
      </Card>

      {pending && (
        <ActionDialog
          kind={pending}
          rows={selectedRows}
          onConfirm={confirmAction}
          onCancel={() => setPending(null)}
        />
      )}

      {evidenceRow && (
        <EvidenceModal
          action={evidenceRow}
          onClose={() => setEvidenceRow(null)}
          onDecision={handleEvidenceDecision}
        />
      )}

      {draft && draftRows.length > 0 && (
        <EmailDraftModal
          kind={draft.kind}
          rows={draftRows}
          onClose={() => setDraft(null)}
        />
      )}
    </div>
  );
}
