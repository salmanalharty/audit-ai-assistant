import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  title,
  icon,
  action,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section
      className={`bg-white rounded-2xl border border-slate-200/70 shadow-sm p-5 ${className}`}
    >
      {(title || action) && (
        <header className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {icon && <span className="text-gold">{icon}</span>}
            {title && (
              <h3 className="font-semibold text-navy text-[15px]">{title}</h3>
            )}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
