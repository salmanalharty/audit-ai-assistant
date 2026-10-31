// فحص كفاية أدلة الإغلاق — تقييم استشاري يسبق قرار المراجع.
//
// المنصة لا تُغلق شيئاً بناءً على هذا التقييم. النموذج يقول ما يغطّيه الدليل
// وما لا يغطّيه، والمراجع هو من يضغط «إغلاق» أو «طلب أدلة إضافية».
import { useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  ShieldCheck,
  UploadCloud,
  Loader2,
  AlertTriangle,
  X,
  Check,
  Minus,
  FileCheck2,
  Info,
  CheckCircle2,
  MailQuestion,
  Save,
} from "lucide-react";
import type { EffectiveAction } from "../../utils/workflow";
import type {
  EvidenceAssessment,
  EvidenceDecision,
  EvidenceVerdict,
} from "../../types/evidence";
import {
  checkEvidence,
  validateEvidenceFile,
  MAX_EVIDENCE_BYTES,
} from "../../services/evidenceApi";
import { RiskBadge } from "../common/Badge";
import { formatDate } from "../../utils/format";

const VERDICT_STYLE: Record<EvidenceVerdict, { bg: string; text: string; border: string }> = {
  "كافٍ": { bg: "#d1fae5", text: "#047857", border: "#6ee7b7" },
  "كافٍ جزئياً": { bg: "#fef3c7", text: "#b45309", border: "#fcd34d" },
  "غير كافٍ": { bg: "#fee2e2", text: "#b91c1c", border: "#fca5a5" },
  "غير ذي صلة": { bg: "#f1f5f9", text: "#475569", border: "#cbd5e1" },
};

function Bullets({
  title,
  items,
  icon,
  color,
}: {
  title: string;
  items: string[];
  icon: ReactNode;
  color: string;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs font-semibold mb-1.5" style={{ color }}>
        {icon}
        {title} <span className="nums opacity-70">({items.length})</span>
      </p>
      <ul className="space-y-1">
        {items.map((t, i) => (
          <li key={i} className="flex items-start gap-1.5 text-xs text-slate-700 leading-relaxed">
            <span
              className="shrink-0 mt-[7px] w-1 h-1 rounded-full"
              style={{ background: color }}
            />
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function EvidenceModal({
  action,
  onClose,
  onDecision,
}: {
  action: EffectiveAction;
  onClose: () => void;
  onDecision: (decision: EvidenceDecision, note: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EvidenceAssessment | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);

    const invalid = validateEvidenceFile(file);
    if (invalid) {
      setError(invalid);
      return;
    }

    setFileName(file.name);
    setBusy(true);
    setElapsed(0);
    setResult(null);
    const timer = window.setInterval(() => setElapsed((s) => s + 1), 1000);

    try {
      setResult(await checkEvidence(file, action));
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذّر فحص الدليل.");
    } finally {
      window.clearInterval(timer);
      setBusy(false);
    }
  }

  /** وصف الحدث المسجَّل في سجل التدقيق — يبقى أثر الدليل وحكمه قابلاً للمراجعة */
  function auditNote(): string {
    if (!result) return "";
    return `فحص الدليل «${fileName}» — الحكم: ${result.verdict} · التوصية: ${result.recommendation}`;
  }

  const style = result ? VERDICT_STYLE[result.verdict] : null;

  return (
    <div
      className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 py-3.5 rounded-t-2xl text-white bg-cyan-700">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} />
            <h3 className="font-semibold">فحص كفاية أدلة الإغلاق</h3>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 rounded-lg p-1" aria-label="إغلاق">
            <X size={18} />
          </button>
        </header>

        <div className="p-5 overflow-y-auto space-y-4">
          {/* الإجراء محلّ الفحص */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className="nums text-[11px] text-slate-500">{action.obs.obsId}</span>
              <RiskBadge level={action.obs.riskLevel} />
              <span className="nums text-[11px] text-slate-500">
                موعد الإغلاق: {formatDate(action.dueDate)}
              </span>
              {action.overdueDays > 0 && (
                <span className="nums text-[11px] text-red-600 font-semibold">
                  متأخر {action.overdueDays} يوماً
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-navy leading-relaxed">{action.obs.title}</p>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              <span className="font-medium text-slate-500">الإجراء التصحيحي المطلوب: </span>
              {action.obs.recommendation}
            </p>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />

          <div
            onClick={() => !busy && inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (!busy) void handleFile(e.dataTransfer.files?.[0]);
            }}
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
              busy
                ? "border-cyan-300 bg-cyan-50/40 cursor-wait"
                : "border-slate-300 hover:border-cyan-600 hover:bg-cyan-50/30 cursor-pointer"
            }`}
          >
            {busy ? (
              <>
                <Loader2 size={24} className="mx-auto text-cyan-700 animate-spin" />
                <p className="text-sm text-cyan-800 font-medium mt-2">جارٍ فحص «{fileName}»…</p>
                <p className="nums text-xs text-slate-500 mt-1">مضى {elapsed} ثانية</p>
              </>
            ) : (
              <>
                <UploadCloud size={24} className="mx-auto text-slate-400" />
                <p className="text-sm text-slate-700 font-medium mt-2">
                  {result ? "ارفع دليلاً آخر" : "اسحب دليل الإغلاق هنا أو اضغط للاختيار"}
                </p>
                <p className="nums text-xs text-slate-500 mt-1">
                  PDF أو صورة · حتى {(MAX_EVIDENCE_BYTES / 1e6).toFixed(1)} ميغابايت
                </p>
              </>
            )}
          </div>

          {error && (
            <p className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2.5">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              {error}
            </p>
          )}

          {result && style && (
            <div className="space-y-3.5">
              <div
                className="rounded-xl p-3.5 border"
                style={{ background: style.bg, borderColor: style.border }}
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-bold text-base" style={{ color: style.text }}>
                    الحكم: {result.verdict}
                  </span>
                  <span
                    className="nums text-[11px] px-2 py-0.5 rounded-full bg-white/70"
                    style={{ color: style.text }}
                  >
                    ثقة {Math.round(result.confidence * 100)}%
                  </span>
                </div>
                <p className="text-xs mt-1.5 leading-relaxed" style={{ color: style.text }}>
                  {result.summary}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Bullets
                  title="ما يغطّيه الدليل"
                  items={result.covered}
                  icon={<Check size={13} />}
                  color="#047857"
                />
                <Bullets
                  title="ما لم يغطّه"
                  items={result.gaps}
                  icon={<Minus size={13} />}
                  color="#b91c1c"
                />
              </div>

              <Bullets
                title="أدلة إضافية يُقترح طلبها"
                items={result.requestedItems}
                icon={<FileCheck2 size={13} />}
                color="#1f3864"
              />

              {result.concerns && (
                <p className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5 leading-relaxed">
                  <Info size={14} className="shrink-0 mt-0.5" />
                  <span>
                    <strong>تحفّظات على الدليل: </strong>
                    {result.concerns}
                  </span>
                </p>
              )}

              <p className="flex items-start gap-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-2.5 leading-relaxed">
                <AlertTriangle size={14} className="shrink-0 mt-0.5 text-slate-400" />
                <span>
                  هذا تقييم <strong>استشاري</strong>: التوصية «{result.recommendation}». المنصة لا
                  تُغلق أي ملاحظة تلقائياً — القرار قرارك، ويُسجَّل باسمك في سجل التدقيق.
                </span>
              </p>
            </div>
          )}
        </div>

        {result && (
          <footer className="flex items-center justify-between gap-2 px-5 py-3.5 border-t border-slate-200 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => onDecision("close", auditNote())}
                className="flex items-center gap-1.5 text-sm text-white bg-status-done px-3 py-2 rounded-lg hover:brightness-110"
              >
                <CheckCircle2 size={15} /> إغلاق الملاحظة
              </button>
              <button
                onClick={() => onDecision("request", auditNote())}
                className="flex items-center gap-1.5 text-sm text-white bg-violet-600 px-3 py-2 rounded-lg hover:brightness-110"
              >
                <MailQuestion size={15} /> طلب أدلة إضافية
              </button>
              <button
                onClick={() => onDecision("record", auditNote())}
                className="flex items-center gap-1.5 text-sm text-slate-700 border border-slate-300 px-3 py-2 rounded-lg hover:bg-slate-50"
              >
                <Save size={15} /> تسجيل النتيجة فقط
              </button>
            </div>
            <button
              onClick={onClose}
              className="text-sm text-slate-600 border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50"
            >
              إلغاء
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}
