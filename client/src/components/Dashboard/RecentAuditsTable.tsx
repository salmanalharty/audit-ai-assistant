import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { AuditOperation } from "../../types/audit";
import { StatusBadge } from "../common/Badge";
import { formatDate } from "../../utils/format";

const PER_PAGE = 5;

export function RecentAuditsTable({ ops }: { ops: AuditOperation[] }) {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);

  // أحدث العمليات حسب تاريخ البداية
  const sorted = [...ops].sort(
    (a, b) => (b.startDate?.getTime() ?? 0) - (a.startDate?.getTime() ?? 0)
  );
  const pages = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
  const slice = sorted.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-500 text-xs border-b border-slate-200">
              <th className="text-right font-medium py-2 px-2">#</th>
              <th className="text-right font-medium py-2 px-2">العملية</th>
              <th className="text-right font-medium py-2 px-2 hidden sm:table-cell">النوع</th>
              <th className="text-right font-medium py-2 px-2">الحالة</th>
              <th className="text-right font-medium py-2 px-2 hidden md:table-cell">البداية</th>
              <th className="text-right font-medium py-2 px-2 hidden lg:table-cell">المسؤول</th>
            </tr>
          </thead>
          <tbody>
            {slice.map((o) => (
              <tr
                key={o.id}
                className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                onClick={() => navigate("/plan")}
              >
                <td className="py-2.5 px-2 nums text-slate-400">{o.id}</td>
                <td className="py-2.5 px-2 text-slate-800 font-medium max-w-[200px] truncate">
                  {o.name}
                </td>
                <td className="py-2.5 px-2 text-slate-600 hidden sm:table-cell">{o.type}</td>
                <td className="py-2.5 px-2">
                  <StatusBadge status={o.status} />
                </td>
                <td className="py-2.5 px-2 nums text-slate-600 hidden md:table-cell">
                  {formatDate(o.startDate)}
                </td>
                <td className="py-2.5 px-2 text-slate-600 hidden lg:table-cell">{o.owner}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-3">
        <button
          onClick={() => navigate("/plan")}
          className="text-sm text-navy font-medium hover:underline"
        >
          عرض الكل ←
        </button>
        {pages > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
            >
              <ChevronRight size={16} />
            </button>
            <span className="nums text-xs text-slate-500 px-2">
              {page + 1} / {pages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
              disabled={page >= pages - 1}
              className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
            >
              <ChevronLeft size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
