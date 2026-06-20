import { Sparkles } from "lucide-react";

export function Header() {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-2.5">
        <div className="md:hidden w-8 h-8 rounded-lg bg-navy flex items-center justify-center text-gold">
          <Sparkles size={16} />
        </div>
        <div>
          <h1 className="font-bold text-navy text-lg leading-tight">
            Audit AI Assistant
          </h1>
          <p className="text-[11px] text-slate-500 hidden sm:block">
            مساعد المراجعة الداخلية الذكي
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span className="hidden sm:inline">نظام دعم المراجعة والحوكمة</span>
        <span className="w-2 h-2 rounded-full bg-status-done inline-block" />
      </div>
    </header>
  );
}
