import { useNavigate } from "react-router-dom";
import { AlertTriangle, Clock, PauseCircle, Flame, ChevronLeft, TimerReset } from "lucide-react";
import type { AuditOperation } from "../../types/audit";
import { smartAlerts, type SmartAlert } from "../../utils/calculations";
import { useAuditStore } from "../../store/auditStore";

const ICONS = {
  late: AlertTriangle,
  notStarted: PauseCircle,
  dueSoon: Clock,
  topRisk: Flame,
  completedLate: TimerReset,
};

const TONES: Record<SmartAlert["kind"], { bg: string; text: string }> = {
  late: { bg: "#ffe0b2", text: "#b45309" },
  notStarted: { bg: "#f0f0f0", text: "#4b5563" },
  dueSoon: { bg: "#d6e4ff", text: "#1d4ed8" },
  topRisk: { bg: "#fde2e2", text: "#b91c1c" },
  completedLate: { bg: "#e9d5ff", text: "#7c3aed" },
};

export function SmartAlerts({ ops }: { ops: AuditOperation[] }) {
  const navigate = useNavigate();
  const setStatus = useAuditStore((s) => s.setStatus);
  const alerts = smartAlerts(ops);

  function handleClick(a: SmartAlert) {
    if (a.kind === "late") setStatus("متأخرة");
    else if (a.kind === "notStarted") setStatus("لم تبدأ");
    else if (a.kind === "completedLate") setStatus("مكتملة");
    navigate("/plan");
  }

  return (
    <div className="space-y-2.5">
      {alerts.map((a) => {
        const Icon = ICONS[a.kind];
        const tone = TONES[a.kind];
        return (
          <button
            key={a.id}
            onClick={() => handleClick(a)}
            className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-navy/40 hover:bg-slate-50 transition-colors text-right"
          >
            <span
              className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: tone.bg, color: tone.text }}
            >
              <Icon size={18} />
            </span>
            <span className="flex-1 text-sm text-slate-700">{a.title}</span>
            <ChevronLeft size={16} className="text-slate-400" />
          </button>
        );
      })}
    </div>
  );
}
