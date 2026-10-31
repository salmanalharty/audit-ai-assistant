// حصيلة المشغّل اليومي — "Daily Trigger" من العرض، بلا إرسال تلقائي.
// لا يظهر شيء إن لم يكن التخزين المشترك مهيأ أو لم يُشغَّل المشغّل بعد.
import { useEffect, useState } from "react";
import { CalendarClock, AlertOctagon, Users, RefreshCw } from "lucide-react";
import type { Digest } from "../../services/digestApi";
import { fetchDigest } from "../../services/digestApi";
import { formatLocalDate } from "../../utils/format";

export function DigestPanel({ onSelect }: { onSelect: (obsIds: string[]) => void }) {
  const [digest, setDigest] = useState<Digest | null>(null);

  useEffect(() => {
    let alive = true;
    void fetchDigest().then((d) => alive && setDigest(d));
    return () => {
      alive = false;
    };
  }, []);

  if (!digest) return null;

  const generated = new Date(digest.generatedAtISO);

  return (
    <div className="border border-gold/30 bg-gold/5 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-navy">
          <CalendarClock size={16} className="text-gold-600" />
          حصيلة المشغّل اليومي
        </p>
        <span className="flex items-center gap-1 nums text-[11px] text-slate-500">
          <RefreshCw size={11} />
          آخر تشغيل {formatLocalDate(generated)}
        </span>
      </div>

      <div className="flex items-center gap-4 flex-wrap text-xs">
        <span className="flex items-center gap-1.5 text-slate-700">
          <CalendarClock size={13} className="text-amber-600" />
          مستحق خلال 30 يوماً: <strong className="nums">{digest.dueSoon}</strong>
        </span>
        <span className="flex items-center gap-1.5 text-slate-700">
          <AlertOctagon size={13} className="text-red-600" />
          متأخر: <strong className="nums">{digest.overdue}</strong>
        </span>
        <span className="flex items-center gap-1.5 text-slate-700">
          <Users size={13} className="text-navy" />
          موزّعة على <strong className="nums">{digest.recipients}</strong> مسؤولاً
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {digest.groups.slice(0, 8).map((g) => (
          <button
            key={g.email || g.responsible}
            onClick={() => onSelect(g.items.map((i) => i.obsId))}
            title="حدِّد ملاحظات هذا المسؤول في الجدول أدناه"
            className="flex items-center gap-1.5 text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 hover:border-navy hover:bg-navy-50/40"
          >
            <span className="text-slate-700">{g.responsible}</span>
            <span className="nums text-slate-400">({g.count})</span>
            {g.overdue > 0 && (
              <span className="nums text-[10px] text-red-600 font-semibold">
                {g.overdue} متأخر
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
