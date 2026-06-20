import { NavLink } from "react-router-dom";
import { LayoutDashboard, Table2, GitCompareArrows, ClipboardList, Sparkles } from "lucide-react";

const links = [
  { to: "/", label: "لوحة التحكم", icon: LayoutDashboard, end: true },
  { to: "/plan", label: "خطة المراجعة", icon: Table2, end: false },
  { to: "/comparison", label: "المقارنة والتحليل", icon: GitCompareArrows, end: false },
  { to: "/follow-up", label: "تقرير المتابعة", icon: ClipboardList, end: false },
];

/** الشريط الجانبي (يمين، RTL) — يظهر على الشاشات المتوسطة فأكبر */
export function Sidebar() {
  return (
    <aside className="hidden md:flex flex-col w-60 shrink-0 bg-navy text-white min-h-screen sticky top-0">
      <div className="flex items-center gap-2 px-5 h-16 border-b border-white/10">
        <div className="w-9 h-9 rounded-lg bg-gold flex items-center justify-center text-navy font-bold">
          <Sparkles size={18} />
        </div>
        <div className="leading-tight">
          <p className="font-bold text-sm">Audit AI</p>
          <p className="text-[11px] text-white/60">مساعد المراجعة</p>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                isActive
                  ? "bg-white/15 text-white font-semibold"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 text-[11px] text-white/40 border-t border-white/10">
        خطة المراجعة 2024–2026
      </div>
    </aside>
  );
}

/** شريط تنقّل سفلي للجوال */
export function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 flex justify-around py-1.5">
      {links.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-1 text-[11px] ${
              isActive ? "text-navy font-semibold" : "text-slate-400"
            }`
          }
        >
          <Icon size={20} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
