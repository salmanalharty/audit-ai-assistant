// اقتراحات محرك القواعد — مخرجات حتمية، كل اقتراح معه القاعدة التي أنتجته.
import { Bell, CalendarPlus, ArrowUpCircle, CheckCircle2, MousePointerClick } from "lucide-react";
import type { Suggestion, SuggestionKind } from "../../utils/workflow";
import { EmptyState } from "../common/EmptyState";

const ICONS: Record<SuggestionKind, typeof Bell> = {
  تذكير: Bell,
  تمديد: CalendarPlus,
  تصعيد: ArrowUpCircle,
  "إغلاق": CheckCircle2,
};

const COLORS: Record<SuggestionKind, string> = {
  تذكير: "#7c3aed",
  تمديد: "#475569",
  تصعيد: "#dc2626",
  "إغلاق": "#10b981",
};

export function SuggestionsPanel({
  items,
  onSelect,
}: {
  items: Suggestion[];
  onSelect: (obsIds: string[]) => void;
}) {
  if (items.length === 0) {
    return <EmptyState message="لا توجد اقتراحات — لا ملاحظة تنطبق عليها قواعد المتابعة حالياً" />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {items.map((s, i) => {
        const Icon = ICONS[s.kind];
        const color = COLORS[s.kind];
        return (
          <div
            key={`${s.kind}-${i}`}
            className="flex items-start gap-3 border border-slate-200 rounded-xl p-3.5 hover:border-slate-300 transition-colors"
          >
            <div
              className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${color}1a`, color }}
            >
              <Icon size={17} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold" style={{ color }}>
                {s.kind}
                <span className="nums text-slate-500 font-normal"> — {s.obsIds.length} ملاحظة</span>
              </p>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{s.rule}</p>
              <button
                onClick={() => onSelect(s.obsIds)}
                className="mt-2 inline-flex items-center gap-1.5 text-xs text-navy border border-navy/25 bg-navy-50 px-2.5 py-1.5 rounded-lg hover:bg-navy hover:text-white transition-colors"
              >
                <MousePointerClick size={13} />
                حدِّد هذه الملاحظات
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
