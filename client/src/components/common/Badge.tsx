import type { AuditStatus, RiskLevel, AuditPhase, AuditType } from "../../types/audit";
import type { ObsStatus, FollowUpCategory } from "../../types/followup";
import {
  STATUS_COLORS,
  RISK_COLORS,
  PHASE_COLORS,
  TYPE_COLORS,
  OBS_STATUS_COLORS,
  CATEGORY_COLORS,
} from "../../utils/theme";

function Pill({ text, c }: { text: string; c: { text: string; bg: string } }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap"
      style={{ color: c.text, backgroundColor: c.bg }}
    >
      {text}
    </span>
  );
}

export function ObsStatusBadge({ status }: { status: ObsStatus }) {
  return <Pill text={status} c={OBS_STATUS_COLORS[status] ?? { text: "#374151", bg: "#e5e7eb" }} />;
}

export function CategoryBadge({ category }: { category: FollowUpCategory }) {
  return <Pill text={category} c={CATEGORY_COLORS[category] ?? { text: "#374151", bg: "#e5e7eb" }} />;
}

export function TypeBadge({ type }: { type: AuditType }) {
  const hex = TYPE_COLORS[type] ?? "#64748b";
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap"
      style={{ color: hex, backgroundColor: `${hex}1a` }}
    >
      {type}
    </span>
  );
}

export function StatusBadge({ status }: { status: AuditStatus }) {
  const c = STATUS_COLORS[status] ?? { text: "#374151", bg: "#e5e7eb" };
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap"
      style={{ color: c.text, backgroundColor: c.bg }}
    >
      {status}
    </span>
  );
}

export function RiskBadge({ level }: { level: RiskLevel }) {
  const c = RISK_COLORS[level] ?? { text: "#374151", bg: "#e5e7eb" };
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap"
      style={{ color: c.text, backgroundColor: c.bg }}
    >
      {level}
    </span>
  );
}

export function PhaseBadge({ phase }: { phase: AuditPhase }) {
  const c = PHASE_COLORS[phase] ?? { text: "#374151", bg: "#e5e7eb" };
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap"
      style={{ color: c.text, backgroundColor: c.bg }}
    >
      {phase}
    </span>
  );
}
