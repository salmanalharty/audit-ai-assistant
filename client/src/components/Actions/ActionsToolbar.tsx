// شريط الإجراءات: يعمل على الملاحظات المحدّدة فقط.
// كل زر يفتح نافذة تأكيد — لا يُنفَّذ أي إجراء بضغطة واحدة.
import { Bell, CalendarPlus, ArrowUpCircle, CheckCircle2, RotateCcw, X } from "lucide-react";
import type { ActionKind } from "../../types/actions";

interface ButtonSpec {
  kind: ActionKind;
  label: string;
  color: string;
  icon: typeof Bell;
}

const BUTTONS: ButtonSpec[] = [
  { kind: "تذكير", label: "تذكير", color: "#7c3aed", icon: Bell },
  { kind: "تمديد", label: "تمديد", color: "#475569", icon: CalendarPlus },
  { kind: "تصعيد", label: "تصعيد", color: "#dc2626", icon: ArrowUpCircle },
  { kind: "إغلاق", label: "إغلاق", color: "#10b981", icon: CheckCircle2 },
  { kind: "إعادة فتح", label: "إعادة فتح", color: "#3b82f6", icon: RotateCcw },
];

export function ActionsToolbar({
  selectedCount,
  onAction,
  onClearSelection,
}: {
  selectedCount: number;
  onAction: (kind: ActionKind) => void;
  onClearSelection: () => void;
}) {
  const disabled = selectedCount === 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-2 me-1">
        <span
          className={`nums inline-flex items-center justify-center min-w-7 h-7 px-2 rounded-lg text-sm font-bold ${
            disabled ? "bg-slate-100 text-slate-400" : "bg-navy text-white"
          }`}
        >
          {selectedCount}
        </span>
        <span className="text-sm text-slate-500">
          {disabled ? "لم تُحدَّد أي ملاحظة" : "ملاحظة محدّدة"}
        </span>
        {!disabled && (
          <button
            onClick={onClearSelection}
            className="text-slate-400 hover:text-slate-700 rounded-lg p-1"
            aria-label="إلغاء التحديد"
            title="إلغاء التحديد"
          >
            <X size={15} />
          </button>
        )}
      </div>

      <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />

      {BUTTONS.map(({ kind, label, color, icon: Icon }) => (
        <button
          key={kind}
          disabled={disabled}
          onClick={() => onAction(kind)}
          style={disabled ? undefined : { backgroundColor: color }}
          className={`flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg transition-all ${
            disabled
              ? "bg-slate-100 text-slate-400 cursor-not-allowed"
              : "text-white hover:brightness-110 active:brightness-95 shadow-sm"
          }`}
        >
          <Icon size={15} />
          {label}
        </button>
      ))}
    </div>
  );
}
