// خرائط ألوان ثابتة للحالات ومستويات الخطورة — تُستخدم في كل مكان
// (badges، رسوم، جداول) لضمان الاتساق البصري.
import type { AuditStatus, AuditType, RiskLevel, AuditPhase } from "../types/audit";
import type { ObsStatus, FollowUpCategory } from "../types/followup";

export const STATUS_COLORS: Record<
  AuditStatus,
  { text: string; bg: string; hex: string }
> = {
  مكتملة: { text: "#0f7a55", bg: "#d4edda", hex: "#10b981" },
  "تحت التنفيذ": { text: "#1d4ed8", bg: "#d6e4ff", hex: "#3b82f6" },
  متأخرة: { text: "#b45309", bg: "#ffe0b2", hex: "#f59e0b" },
  "لم تبدأ": { text: "#4b5563", bg: "#f0f0f0", hex: "#9ca3af" },
  مؤجلة: { text: "#b91c1c", bg: "#f8d7da", hex: "#ef4444" },
};

export const RISK_COLORS: Record<RiskLevel, { text: string; bg: string; hex: string }> = {
  عالي: { text: "#b91c1c", bg: "#fde2e2", hex: "#ef4444" },
  متوسط: { text: "#b45309", bg: "#fef0d6", hex: "#f59e0b" },
  منخفض: { text: "#0f7a55", bg: "#d8f3e6", hex: "#10b981" },
};

export const PHASE_COLORS: Record<AuditPhase, { text: string; bg: string; hex: string }> = {
  تخطيط: { text: "#475569", bg: "#e2e8f0", hex: "#94a3b8" },
  "عمل ميداني": { text: "#1d4ed8", bg: "#dbeafe", hex: "#3b82f6" },
  تقرير: { text: "#0f7a55", bg: "#d1fae5", hex: "#10b981" },
};

export const OBS_STATUS_COLORS: Record<ObsStatus, { text: string; bg: string; hex: string }> = {
  مغلقة: { text: "#0f7a55", bg: "#d4edda", hex: "#10b981" },
  "لم تغلق": { text: "#b91c1c", bg: "#fde2e2", hex: "#ef4444" },
};

export const CATEGORY_COLORS: Record<FollowUpCategory, { text: string; bg: string; hex: string }> = {
  "مغلقة في الموعد": { text: "#0f7a55", bg: "#d4edda", hex: "#10b981" },
  "مغلقة بعد تأجيل": { text: "#4d7c0f", bg: "#ecfccb", hex: "#84cc16" },
  "ضمن المهلة": { text: "#1d4ed8", bg: "#d6e4ff", hex: "#3b82f6" },
  مؤجلة: { text: "#b45309", bg: "#ffe0b2", hex: "#f59e0b" },
  متأخرة: { text: "#b91c1c", bg: "#fde2e2", hex: "#ef4444" },
};

export const TYPE_COLORS: Record<AuditType, string> = {
  "تقنية معلومات": "#1f3864",
  مالية: "#c9a94e",
  مؤسسية: "#3b82f6",
};

/** لون متدرّج بحسب درجة المخاطر 0–100 (أخضر → أصفر → أحمر) */
export function riskScoreColor(score: number): string {
  const s = Math.max(0, Math.min(100, score));
  if (s < 40) {
    // أخضر → أصفر
    const t = s / 40;
    return lerpColor("#10b981", "#f59e0b", t);
  }
  // أصفر → أحمر
  const t = (s - 40) / 60;
  return lerpColor("#f59e0b", "#ef4444", t);
}

function lerpColor(a: string, b: string, t: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const r = Math.round(ca.r + (cb.r - ca.r) * t);
  const g = Math.round(ca.g + (cb.g - ca.g) * t);
  const bl = Math.round(ca.b + (cb.b - ca.b) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

export const BRAND = {
  navy: "#1f3864",
  gold: "#c9a94e",
  canvas: "#f8f9fc",
};
