import { useState, useRef, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Sparkles, Send, X, MessageSquare, Loader2 } from "lucide-react";
import { useAuditStore, selectYearOps } from "../../store/auditStore";
import {
  askClaude,
  buildSystemPrompt,
  buildFollowUpSystemPrompt,
  type ChatMessage,
} from "../../services/chatApi";

function quickPrompts(year: number): string[] {
  return [
    `العمليات المتأخرة في ${year}`,
    `كم نسبة الإنجاز في ${year}؟`,
    "العمليات المكتملة",
    "مراجعات تقنية المعلومات",
    "قارن بين 2024 و 2025",
    "اكتب ملخصاً تنفيذياً لحالة الخطة",
  ];
}

const FOLLOWUP_PROMPTS = [
  "ما أكثر الإدارات تأخراً في إغلاق الملاحظات؟",
  "اعرض الملاحظات عالية الخطورة غير المغلقة",
  "ما الملاحظات المتكررة عبر السنوات؟",
  "لخّص حالة المتابعة لعام 2025",
  "ما الملاحظات التي تحتاج تصعيداً عاجلاً؟",
];

export function AssistantPanel() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const ops = useAuditStore(selectYearOps);
  const followUp = useAuditStore((s) => s.followUp);
  const year = useAuditStore((s) => s.year);
  const type = useAuditStore((s) => s.type);
  const status = useAuditStore((s) => s.status);

  const location = useLocation();
  const isFollowUp = location.pathname === "/follow-up";

  const chips = useMemo(
    () => (isFollowUp ? FOLLOWUP_PROMPTS : quickPrompts(year)),
    [isFollowUp, year]
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const history: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(history);
    setInput("");
    setLoading(true);
    try {
      const system = isFollowUp
        ? buildFollowUpSystemPrompt(followUp)
        : buildSystemPrompt(ops, year, { type, status });
      const reply = await askClaude(system, history);
      setMessages([...history, { role: "assistant", content: reply }]);
    } catch (e) {
      setMessages([
        ...history,
        {
          role: "assistant",
          content:
            "⚠️ " +
            (e instanceof Error ? e.message : "حدث خطأ.") +
            "\n\nتأكد من تشغيل الخادم الوسيط ووضع مفتاح API في `server/.env`.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* زر عائم لفتح المساعد */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-20 md:bottom-6 left-4 md:left-6 z-50 flex items-center gap-2 bg-navy text-white px-4 py-3 rounded-full shadow-lg hover:bg-navy-700 transition-colors"
        >
          <Sparkles size={18} className="text-gold" />
          <span className="text-sm font-medium">المساعد الذكي</span>
        </button>
      )}

      {/* اللوحة */}
      {open && (
        <div className="fixed inset-0 md:inset-auto md:bottom-6 md:left-6 md:w-[400px] md:h-[600px] z-50 flex flex-col bg-white md:rounded-2xl shadow-2xl border border-slate-200 animate-fade-in-up">
          {/* رأس */}
          <div className="flex items-center justify-between px-4 py-3 bg-navy text-white md:rounded-t-2xl">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-gold" />
              <span className="font-semibold">المساعد الذكي</span>
            </div>
            <button onClick={() => setOpen(false)} className="hover:bg-white/15 rounded-lg p-1">
              <X size={18} />
            </button>
          </div>

          {/* الرسائل */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-sm">
                <div className="bg-navy-50 rounded-xl p-3 text-slate-700">
                  مرحباً بك 👋 كيف أقدر أساعدك اليوم في خطة المراجعة الداخلية؟
                </div>
                <p className="text-[11px] text-slate-400 mt-2 mb-2">
                  يدعم النظام اللغة العربية بشكل كامل ✅
                </p>
                <div className="flex flex-wrap gap-2">
                  {chips.map((c) => (
                    <button
                      key={c}
                      onClick={() => send(c)}
                      className="text-xs bg-white border border-slate-300 rounded-full px-3 py-1.5 text-slate-600 hover:border-navy hover:text-navy transition-colors"
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                    m.role === "user"
                      ? "bg-navy text-white rounded-tr-sm"
                      : "bg-slate-100 text-slate-800 rounded-tl-sm"
                  }`}
                >
                  {m.role === "assistant" ? (
                    <div className="prose-chat">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                    </div>
                  ) : (
                    m.content
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-end">
                <div className="bg-slate-100 rounded-2xl px-3.5 py-2.5 flex items-center gap-2 text-slate-500 text-sm">
                  <Loader2 size={16} className="animate-spin" />
                  يفكّر المساعد…
                </div>
              </div>
            )}
          </div>

          {/* الإدخال */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="p-3 border-t border-slate-200 flex items-center gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="اكتب سؤالك هنا…"
              className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-navy text-white w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-40 hover:bg-navy-700 transition-colors"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}

export { MessageSquare };
