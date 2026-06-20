// أدوات تنسيق التواريخ والنِّسَب

/** تحويل رقم Excel التسلسلي إلى Date (epoch = 1899-12-30) */
export function excelSerialToDate(serial: number): Date | null {
  if (typeof serial !== "number" || !isFinite(serial)) return null;
  const ms = Math.round((serial - 25569) * 86400 * 1000);
  const d = new Date(ms);
  return isNaN(d.getTime()) ? null : d;
}

/** عرض التاريخ بصيغة DD/MM/YYYY */
export function formatDate(d: Date | null): string {
  if (!d) return "—";
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

/** عرض نسبة مئوية من كسر 0..1 */
export function formatPercent(fraction: number, digits = 0): string {
  if (typeof fraction !== "number" || !isFinite(fraction)) return "0%";
  return `${(fraction * 100).toFixed(digits)}%`;
}

/** عدد الأيام بين تاريخين (b - a) */
export function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

/** عدد الأيام من اليوم حتى تاريخ معيّن (موجب = مستقبل) */
export function daysUntil(target: Date | null, today = new Date()): number {
  if (!target) return NaN;
  return daysBetween(today, target);
}

/** أرقام عربية-لاتينية ضمن span متناسق الاتجاه */
export function n(value: number | string): string {
  return String(value);
}
