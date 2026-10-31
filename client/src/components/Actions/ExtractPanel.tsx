// رفع تقرير مراجعة PDF واستخراج الملاحظات منه بالذكاء الاصطناعي.
//
// المخرَج **مقترَح** لا معتمَد: لكل ملاحظة اقتباس حرفي من التقرير ورقم صفحة
// ودرجة ثقة، وكل الحقول قابلة للتحرير، ولا تدخل السجل إلا بعد اعتماد المراجع.
import { useRef, useState } from "react";
import {
  UploadCloud,
  FileText,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  X,
  Quote,
  Info,
} from "lucide-react";
import type { ExtractedObservation, ExtractionResult } from "../../types/extraction";
import { LOW_CONFIDENCE } from "../../types/extraction";
import type { AuditType, RiskLevel } from "../../types/audit";
import { AUDIT_TYPES, RISK_LEVELS } from "../../types/audit";
import { extractObservations, validatePdfFile, MAX_PDF_BYTES } from "../../services/extractApi";
import { toFollowUpObservation } from "../../utils/importObs";
import { useActionsStore } from "../../store/actionsStore";
import { RISK_COLORS } from "../../utils/theme";
import { EmptyState } from "../common/EmptyState";

type Phase = "idle" | "working" | "done";

interface Row extends ExtractedObservation {
  selected: boolean;
}

/** أكبر تسلسل مستخدم لسنة معيّنة — حتى لا تتكرّر المعرّفات بعد الحذف */
function nextSeq(existingIds: string[], year: number): number {
  const re = new RegExp(`^OBS-${year}-I(\\d+)$`);
  let max = 0;
  for (const id of existingIds) {
    const m = re.exec(id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max + 1;
}

function ConfidenceBadge({ value }: { value: number }) {
  const low = value < LOW_CONFIDENCE;
  return (
    <span
      className={`nums text-[11px] font-semibold px-2 py-0.5 rounded-full ${
        low ? "bg-amber-100 text-amber-700" : "bg-emerald-50 text-emerald-700"
      }`}
      title={low ? "ثقة منخفضة — راجِع الاقتباس قبل الاعتماد" : "ثقة مرتفعة"}
    >
      {Math.round(value * 100)}%
    </span>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  dir,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  dir?: "ltr" | "rtl";
}) {
  return (
    <label className="block">
      <span className="text-[11px] text-slate-500 block mb-0.5">{label}</span>
      <input
        value={value}
        dir={dir}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-navy/30"
      />
    </label>
  );
}

function ExtractedCard({
  row,
  index,
  onChange,
}: {
  row: Row;
  index: number;
  onChange: (patch: Partial<Row>) => void;
}) {
  const risk = RISK_COLORS[row.riskLevel];
  return (
    <div
      className={`border rounded-xl p-3.5 transition-colors ${
        row.selected ? "border-navy/40 bg-navy-50/40" : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-start gap-2.5">
        <input
          type="checkbox"
          checked={row.selected}
          onChange={(e) => onChange({ selected: e.target.checked })}
          className="w-4 h-4 mt-1 accent-[#1f3864] cursor-pointer shrink-0"
          aria-label={`اعتماد الملاحظة ${index + 1}`}
        />
        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="nums text-[11px] text-slate-400">#{index + 1}</span>
            <ConfidenceBadge value={row.confidence} />
            {row.sourcePage > 0 && (
              <span className="nums text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                صفحة {row.sourcePage}
              </span>
            )}
            <span
              className="text-[11px] font-medium px-2 py-0.5 rounded-full"
              style={{ color: risk.text, backgroundColor: risk.bg }}
            >
              {row.riskLevel}
            </span>
          </div>

          <label className="block">
            <span className="text-[11px] text-slate-500 block mb-0.5">عنوان الملاحظة</span>
            <input
              value={row.title}
              onChange={(e) => onChange({ title: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-navy/30"
            />
          </label>

          <label className="block">
            <span className="text-[11px] text-slate-500 block mb-0.5">الإجراء التصحيحي</span>
            <textarea
              value={row.recommendation}
              rows={2}
              onChange={(e) => onChange({ recommendation: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-navy/30"
            />
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <label className="block">
              <span className="text-[11px] text-slate-500 block mb-0.5">درجة الخطر</span>
              <select
                value={row.riskLevel}
                onChange={(e) => onChange({ riskLevel: e.target.value as RiskLevel })}
                className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-navy/30"
              >
                {RISK_LEVELS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[11px] text-slate-500 block mb-0.5">نوع المراجعة</span>
              <select
                value={row.auditType}
                onChange={(e) => onChange({ auditType: e.target.value as AuditType })}
                className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-navy/30"
              >
                {AUDIT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <Field
              label="موعد الإغلاق"
              value={row.dueDate}
              placeholder="Q1 2027"
              onChange={(v) => onChange({ dueDate: v })}
            />
            <Field
              label="الإدارة"
              value={row.department}
              placeholder="غير محددة"
              onChange={(v) => onChange({ department: v })}
            />
            <Field
              label="المسؤول عن التنفيذ"
              value={row.responsible}
              placeholder="غير محدد"
              onChange={(v) => onChange({ responsible: v })}
            />
            <Field
              label="البريد الإلكتروني"
              value={row.email}
              placeholder="name@company.sa"
              dir="ltr"
              onChange={(v) => onChange({ email: v })}
            />
          </div>

          {row.sourceQuote && (
            <p className="flex items-start gap-1.5 text-[11px] text-slate-500 bg-slate-50 border-s-2 border-gold rounded px-2.5 py-1.5 leading-relaxed">
              <Quote size={12} className="shrink-0 mt-0.5 text-gold-600" />
              <span dir="auto">{row.sourceQuote}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function ExtractPanel() {
  const imported = useActionsStore((s) => s.imported);
  const addImported = useActionsStore((s) => s.addImported);

  const [phase, setPhase] = useState<Phase>("idle");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [savedCount, setSavedCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setSavedCount(0);

    const invalid = validatePdfFile(file);
    if (invalid) {
      setError(invalid);
      return;
    }

    setFileName(file.name);
    setPhase("working");
    setElapsed(0);
    const timer = window.setInterval(() => setElapsed((s) => s + 1), 1000);

    try {
      const res = await extractObservations(file);
      setResult(res);
      setRows(
        res.observations.map((o) => ({
          ...o,
          // الثقة المنخفضة لا تُحدَّد تلقائياً — نُجبر المراجع على قرار واعٍ
          selected: o.confidence >= LOW_CONFIDENCE,
        }))
      );
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذّر تحليل التقرير.");
      setPhase("idle");
    } finally {
      window.clearInterval(timer);
    }
  }

  function updateRow(index: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function approve() {
    if (!result) return;
    const chosen = rows.filter((r) => r.selected);
    if (chosen.length === 0) return;

    const today = new Date();
    const year = result.year > 0 ? result.year : today.getUTCFullYear();
    let seq = nextSeq(
      imported.map((o) => o.obsId),
      year
    );

    const converted = chosen.map((r) =>
      toFollowUpObservation(r, {
        year,
        reportTitle: result.reportTitle,
        seq: seq++,
        today,
      })
    );

    addImported(converted, result.reportTitle);
    setSavedCount(converted.length);
    setRows((prev) => prev.filter((r) => !r.selected));
  }

  function reset() {
    setPhase("idle");
    setResult(null);
    setRows([]);
    setError(null);
    setFileName("");
    setSavedCount(0);
    if (inputRef.current) inputRef.current.value = "";
  }

  const selectedCount = rows.filter((r) => r.selected).length;

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />

      {phase !== "done" && (
        <div
          onClick={() => phase === "idle" && inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (phase === "idle") void handleFile(e.dataTransfer.files?.[0]);
          }}
          className={`border-2 border-dashed rounded-xl p-7 text-center transition-colors ${
            phase === "working"
              ? "border-navy/30 bg-navy-50/40 cursor-wait"
              : "border-slate-300 hover:border-navy hover:bg-navy-50/30 cursor-pointer"
          }`}
        >
          {phase === "working" ? (
            <>
              <Loader2 size={26} className="mx-auto text-navy animate-spin" />
              <p className="text-sm text-navy font-medium mt-2.5">جارٍ تحليل «{fileName}»…</p>
              <p className="nums text-xs text-slate-500 mt-1">
                مضى {elapsed} ثانية — قد يستغرق حتى دقيقة بحسب عدد الصفحات
              </p>
            </>
          ) : (
            <>
              <UploadCloud size={26} className="mx-auto text-slate-400" />
              <p className="text-sm text-slate-700 font-medium mt-2.5">
                اسحب تقرير المراجعة هنا أو اضغط للاختيار
              </p>
              <p className="nums text-xs text-slate-500 mt-1">
                PDF فقط · حتى {(MAX_PDF_BYTES / 1e6).toFixed(1)} ميغابايت
              </p>
            </>
          )}
        </div>
      )}

      {error && (
        <p className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2.5">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          {error}
        </p>
      )}

      {savedCount > 0 && (
        <p className="flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">
          <CheckCircle2 size={14} className="shrink-0" />
          اعتُمدت <strong className="nums">{savedCount}</strong> ملاحظة وأُضيفت إلى سجل الإجراءات
          أدناه مع تسجيلها في سجل التدقيق.
        </p>
      )}

      {phase === "done" && result && (
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex-wrap">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-navy">
                <FileText size={15} className="text-gold" />
                {result.reportTitle || fileName}
              </p>
              <p className="nums text-xs text-slate-500 mt-0.5">
                {result.year > 0 && `سنة ${result.year} · `}
                استُخرجت {result.observations.length} ملاحظة · متبقٍ للمراجعة {rows.length}
              </p>
              {result.notes && (
                <p className="flex items-start gap-1.5 text-xs text-amber-700 mt-1.5">
                  <Info size={13} className="shrink-0 mt-0.5" />
                  {result.notes}
                </p>
              )}
            </div>
            <button
              onClick={reset}
              className="flex items-center gap-1.5 text-xs text-slate-600 border border-slate-300 bg-white px-2.5 py-1.5 rounded-lg hover:bg-slate-50"
            >
              <X size={13} /> تقرير آخر
            </button>
          </div>

          {rows.length === 0 ? (
            <EmptyState message="لم يتبقَّ شيء للمراجعة — ارفع تقريراً آخر أو راجع السجل أدناه" />
          ) : (
            <>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-xs text-slate-500">
                  راجِع كل ملاحظة وعدّل ما يلزم — الاقتباس تحت كل ملاحظة هو نصّها الأصلي في
                  التقرير.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setRows((p) => p.map((r) => ({ ...r, selected: true })))}
                    className="text-xs text-slate-600 border border-slate-300 px-2.5 py-1.5 rounded-lg hover:bg-slate-50"
                  >
                    تحديد الكل
                  </button>
                  <button
                    onClick={() => setRows((p) => p.map((r) => ({ ...r, selected: false })))}
                    className="text-xs text-slate-600 border border-slate-300 px-2.5 py-1.5 rounded-lg hover:bg-slate-50"
                  >
                    إلغاء التحديد
                  </button>
                </div>
              </div>

              <div className="space-y-2.5 max-h-[520px] overflow-y-auto pe-1">
                {rows.map((row, i) => (
                  <ExtractedCard
                    key={`${row.title}-${i}`}
                    row={row}
                    index={i}
                    onChange={(patch) => updateRow(i, patch)}
                  />
                ))}
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  disabled={selectedCount === 0}
                  onClick={approve}
                  className={`flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg ${
                    selectedCount === 0
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                      : "bg-status-done text-white hover:brightness-110"
                  }`}
                >
                  <CheckCircle2 size={15} />
                  اعتماد المحدّد ({selectedCount})
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
