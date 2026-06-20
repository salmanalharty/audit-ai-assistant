import { ChevronDown } from "lucide-react";

export function Select<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label?: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label && <span className="text-slate-500 text-xs">{label}</span>}
      <div className="relative">
        <select
          value={value}
          onChange={(e) => {
            const raw = e.target.value;
            const match = options.find((o) => String(o.value) === raw);
            if (match) onChange(match.value);
          }}
          className="appearance-none w-full bg-white border border-slate-300 rounded-lg ps-3 pe-8 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy cursor-pointer"
        >
          {options.map((o) => (
            <option key={String(o.value)} value={String(o.value)}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
      </div>
    </label>
  );
}
