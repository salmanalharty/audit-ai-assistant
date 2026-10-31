// نافذة مراجعة مسودات المراسلات — خطوة «Review Draft» قبل الإرسال.
// لا ترسل هذه الشاشة أي بريد: تنسخ، أو تنزّل ملف .eml، أو تفتح برنامج البريد.
import { useEffect, useMemo, useState } from "react";
import {
  X,
  Sparkles,
  Copy,
  Check,
  Download,
  Mail,
  Loader2,
  AlertTriangle,
  Users,
  DownloadCloud,
  Send,
  KeyRound,
} from "lucide-react";
import type { ActionKind } from "../../types/actions";
import type { EffectiveAction } from "../../utils/workflow";
import type { EmailDraft } from "../../utils/emailTemplates";
import {
  buildDrafts,
  draftHtml,
  draftPlainText,
  draftTableHtml,
  downloadEml,
  mailtoUrl,
} from "../../utils/emailTemplates";
import {
  getMailToken,
  isSendingEnabled,
  sendEmail,
  setMailToken,
} from "../../services/mailApi";
import { polishEmailProse } from "../../services/chatApi";
import { EVENT_COLORS } from "../../utils/theme";

export function EmailDraftModal({
  kind,
  rows,
  onClose,
}: {
  kind: ActionKind;
  rows: EffectiveAction[];
  onClose: () => void;
}) {
  const [drafts, setDrafts] = useState<EmailDraft[]>(() => buildDrafts(kind, rows));
  // فارغ = أول مسودة (نتفادى استدعاء buildDrafts مرتين)
  const [activeKey, setActiveKey] = useState("");
  const [polishing, setPolishing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // الإرسال الفعلي: معطّل ما لم يُهيَّأ على الخادم (انظر api/send-email.js)
  const [sendEnabled, setSendEnabled] = useState(false);
  const [askToken, setAskToken] = useState(false);
  const [token, setToken] = useState("");
  const [sending, setSending] = useState(false);
  const [sentKeys, setSentKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    let alive = true;
    void isSendingEnabled().then((on) => alive && setSendEnabled(on));
    return () => {
      alive = false;
    };
  }, []);

  const color = EVENT_COLORS[kind];
  const active = drafts.find((d) => d.key === activeKey) ?? drafts[0];

  // الجدول مبنيّ داخلياً من بياناتنا ومهرَّب بالكامل في emailTemplates — آمن للحقن
  const tableHtml = useMemo(
    () => (active ? draftTableHtml(kind, active.rows) : ""),
    [kind, active]
  );

  if (!active) return null;

  function update(patch: Partial<EmailDraft>) {
    // نقارن بمفتاح المسودة النشطة فعلاً، لا بـ activeKey (قد يكون فارغاً)
    setDrafts((prev) => prev.map((d) => (d.key === active.key ? { ...d, ...patch } : d)));
  }

  async function polish() {
    setPolishing(true);
    setAiError(null);
    try {
      const { intro, closing } = await polishEmailProse(
        kind,
        active.recipientName,
        active.rows.length,
        active.intro,
        active.closing
      );
      update({ intro, closing });
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "تعذّر الاتصال بالمساعد.");
    } finally {
      setPolishing(false);
    }
  }

  async function send() {
    const saved = token || getMailToken();
    if (!saved) {
      setAskToken(true);
      return;
    }
    if (!active.recipientEmail) {
      setAiError("لا يوجد بريد إلكتروني لهذا المستلم.");
      return;
    }

    setSending(true);
    setAiError(null);
    try {
      await sendEmail(
        {
          to: active.recipientEmail,
          subject: active.subject,
          html: draftHtml(kind, active),
        },
        saved
      );
      setMailToken(saved);
      setAskToken(false);
      setSentKeys((prev) => new Set(prev).add(active.key));
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "تعذّر إرسال الرسالة.");
      setAskToken(true);
    } finally {
      setSending(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(draftPlainText(kind, active));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setAiError("تعذّر النسخ — المتصفح منع الوصول إلى الحافظة.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <header
          className="flex items-center justify-between px-5 py-3.5 rounded-t-2xl text-white"
          style={{ backgroundColor: color }}
        >
          <div className="flex items-center gap-2">
            <Mail size={18} />
            <h3 className="font-semibold">مسودات المراسلات — {kind}</h3>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 rounded-lg p-1" aria-label="إغلاق">
            <X size={18} />
          </button>
        </header>

        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/60">
          <p className="flex items-center gap-1.5 text-xs text-slate-600">
            <Users size={14} className="text-navy" />
            جُمِّعت <strong className="nums">{rows.length}</strong> ملاحظة في{" "}
            <strong className="nums">{drafts.length}</strong> رسالة — رسالة واحدة لكل مسؤول، لا
            رسالة لكل ملاحظة.
          </p>
          {drafts.length > 1 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {drafts.map((d) => (
                <button
                  key={d.key}
                  onClick={() => setActiveKey(d.key)}
                  className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                    d.key === active.key
                      ? "bg-navy text-white border-navy"
                      : "bg-white text-slate-600 border-slate-300 hover:border-navy"
                  }`}
                >
                  {d.recipientName} <span className="nums opacity-70">({d.rows.length})</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-slate-500 block mb-1">إلى</span>
              <input
                readOnly
                value={`${active.recipientName} <${active.recipientEmail}>`}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600"
                dir="ltr"
              />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500 block mb-1">الموضوع</span>
              <input
                value={active.subject}
                onChange={(e) => update({ subject: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30"
              />
            </label>
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs text-slate-500">
              النص قابل للتحرير — الجدول يُبنى من البيانات ولا يُعدَّل.
            </span>
            <button
              onClick={polish}
              disabled={polishing}
              className="flex items-center gap-1.5 text-xs font-medium bg-navy text-white px-3 py-2 rounded-lg hover:bg-navy-700 disabled:opacity-60"
            >
              {polishing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} className="text-gold" />}
              {polishing ? "جارٍ التحسين…" : "حسِّن الصياغة بالذكاء الاصطناعي"}
            </button>
          </div>

          {aiError && (
            <p className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2.5">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              {aiError}
            </p>
          )}

          <label className="block">
            <span className="text-xs text-slate-500 block mb-1">المقدمة</span>
            <textarea
              value={active.intro}
              onChange={(e) => update({ intro: e.target.value })}
              rows={5}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-navy/30"
            />
          </label>

          <div>
            <span className="text-xs text-slate-500 block mb-1">
              جدول الإجراءات (<span className="nums">{active.rows.length}</span>) — تلقائي
            </span>
            <div
              className="border border-slate-200 rounded-lg overflow-x-auto p-2 bg-slate-50/40 [&_table]:w-full [&_table]:border-collapse [&_table]:text-[11px] [&_th]:bg-navy [&_th]:text-white [&_th]:p-1.5 [&_th]:border [&_th]:border-slate-300 [&_td]:p-1.5 [&_td]:border [&_td]:border-slate-200 [&_td]:align-top [&_th]:text-right [&_td]:text-right"
              dangerouslySetInnerHTML={{ __html: tableHtml }}
            />
          </div>

          <label className="block">
            <span className="text-xs text-slate-500 block mb-1">الخاتمة</span>
            <textarea
              value={active.closing}
              onChange={(e) => update({ closing: e.target.value })}
              rows={3}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-navy/30"
            />
          </label>
        </div>

        {askToken && (
          <div className="px-5 py-3 border-t border-slate-200 bg-gold/5">
            <label className="block">
              <span className="flex items-center gap-1.5 text-xs text-slate-600 mb-1">
                <KeyRound size={13} className="text-gold-600" />
                رمز الإرسال — يلزم لأن الموقع عام بلا تسجيل دخول
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void send()}
                  placeholder="أدخل الرمز ثم اضغط إرسال"
                  className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40"
                  dir="ltr"
                />
                <button
                  onClick={() => void send()}
                  disabled={!token || sending}
                  className="text-sm bg-gold-600 text-white px-3 py-2 rounded-lg hover:brightness-110 disabled:opacity-50"
                >
                  تأكيد
                </button>
              </div>
            </label>
          </div>
        )}

        <footer className="flex items-center justify-between gap-2 px-5 py-3.5 border-t border-slate-200 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={copy}
              className="flex items-center gap-1.5 text-sm text-slate-700 border border-slate-300 px-3 py-2 rounded-lg hover:bg-slate-50"
            >
              {copied ? <Check size={15} className="text-status-done" /> : <Copy size={15} />}
              {copied ? "تم النسخ" : "نسخ النص"}
            </button>
            <button
              onClick={() => downloadEml(kind, active)}
              className="flex items-center gap-1.5 text-sm text-white bg-navy px-3 py-2 rounded-lg hover:bg-navy-700"
            >
              <Download size={15} /> تنزيل ‎.eml
            </button>
            <a
              href={mailtoUrl(kind, active)}
              className="flex items-center gap-1.5 text-sm text-slate-700 border border-slate-300 px-3 py-2 rounded-lg hover:bg-slate-50"
            >
              <Mail size={15} /> فتح في البريد
            </a>
            {sendEnabled && (
              <button
                onClick={() => void send()}
                disabled={sending || sentKeys.has(active.key)}
                className={`flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg ${
                  sentKeys.has(active.key)
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default"
                    : "bg-gold-600 text-white hover:brightness-110 disabled:opacity-60"
                }`}
              >
                {sending ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : sentKeys.has(active.key) ? (
                  <Check size={15} />
                ) : (
                  <Send size={15} />
                )}
                {sentKeys.has(active.key) ? "أُرسلت" : "إرسال الآن"}
              </button>
            )}
            {drafts.length > 1 && (
              <button
                onClick={() => drafts.forEach((d) => downloadEml(kind, d))}
                className="flex items-center gap-1.5 text-sm text-slate-700 border border-slate-300 px-3 py-2 rounded-lg hover:bg-slate-50"
              >
                <DownloadCloud size={15} /> تنزيل الكل ({drafts.length})
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-sm text-slate-600 border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50"
          >
            إغلاق
          </button>
        </footer>
      </div>
    </div>
  );
}
