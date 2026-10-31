// سجل التدقيق — مَن فعل ماذا ومتى. للعرض فقط؛ الأحداث لا تُعدَّل بعد تسجيلها.
import { useState } from "react";
import type { ActionEvent } from "../../types/actions";
import { EVENT_COLORS } from "../../utils/theme";
import { EmptyState } from "../common/EmptyState";

const INITIAL = 12;

/** تاريخ ووقت محليان (الأحداث تُنشأ لحظياً، فالتوقيت المحلي هو المعبّر) */
function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} · ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function ActivityLog({ events }: { events: ActionEvent[] }) {
  const [expanded, setExpanded] = useState(false);

  if (events.length === 0) {
    return (
      <EmptyState message="لا توجد أحداث بعد — نفّذ أول إجراء وسيظهر هنا مع وقته ومنفّذه" />
    );
  }

  const shown = expanded ? events : events.slice(0, INITIAL);

  return (
    <div>
      <ol className="relative border-s-2 border-slate-100 ms-2 space-y-3">
        {shown.map((e) => (
          <li key={e.id} className="ps-4 relative">
            <span
              className="absolute -start-[7px] top-1.5 w-3 h-3 rounded-full border-2 border-white"
              style={{ backgroundColor: EVENT_COLORS[e.type] ?? "#94a3b8" }}
            />
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span
                className="text-xs font-semibold"
                style={{ color: EVENT_COLORS[e.type] ?? "#475569" }}
              >
                {e.type}
              </span>
              <span className="nums text-xs text-slate-400">{e.obsId}</span>
              <span className="text-xs text-slate-600">— {e.note}</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              <span className="nums">{formatDateTime(e.atISO)}</span> · {e.actor}
            </div>
          </li>
        ))}
      </ol>

      {events.length > INITIAL && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 text-xs text-navy border border-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-50"
        >
          {expanded ? "عرض أقل" : `عرض الكل (${events.length})`}
        </button>
      )}
    </div>
  );
}
