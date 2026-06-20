import { Inbox } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({ message, icon }: { message: string; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
      {icon ?? <Inbox size={40} className="mb-3" />}
      <p className="text-sm">{message}</p>
    </div>
  );
}
