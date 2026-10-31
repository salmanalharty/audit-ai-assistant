// استدعاء /api/extract + تطهير المخرجات قبل عرضها.
//
// نُطهّر كل حقل هنا ولا نثق بما يعيده النموذج مباشرةً: نُثبّت القيم ضمن
// المجموعات المسموحة ونحوّل الأنواع، حتى لا تتسرّب قيمة غريبة إلى الواجهة.
import type { ExtractedObservation, ExtractionResult } from "../types/extraction";
import type { AuditType, RiskLevel } from "../types/audit";
import { AUDIT_TYPES, RISK_LEVELS } from "../types/audit";

/** الحد الأقصى لحجم الملف — مطابق لـ MAX_PDF_BYTES في api/_extraction.js */
export const MAX_PDF_BYTES = 3_000_000;

export function validatePdfFile(file: File): string | null {
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return "الملف يجب أن يكون بصيغة PDF.";
  }
  if (file.size > MAX_PDF_BYTES) {
    return `حجم الملف ${(file.size / 1e6).toFixed(1)} ميغابايت ويتجاوز الحد المسموح (${(
      MAX_PDF_BYTES / 1e6
    ).toFixed(1)} ميغابايت). جرّب تقريراً أصغر أو اقتطع الصفحات المطلوبة.`;
  }
  return null;
}

/** تحويل الملف إلى base64 بلا بادئة data: */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error("تعذّرت قراءة الملف."));
    reader.readAsDataURL(file);
  });
}

function pickEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  const s = String(value ?? "").trim();
  return (allowed as readonly string[]).includes(s) ? (s as T) : fallback;
}

function sanitize(raw: unknown): ExtractedObservation | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const title = String(o.title ?? "").trim();
  const recommendation = String(o.recommendation ?? "").trim();
  if (!title || !recommendation) return null; // ملاحظة بلا عنوان أو إجراء لا قيمة لها

  const confidence = Number(o.confidence);
  return {
    title,
    recommendation,
    riskLevel: pickEnum<RiskLevel>(o.riskLevel, RISK_LEVELS, "متوسط"),
    auditType: pickEnum<AuditType>(o.auditType, AUDIT_TYPES, "مؤسسية"),
    department: String(o.department ?? "").trim(),
    responsible: String(o.responsible ?? "").trim(),
    email: "",
    dueDate: String(o.dueDate ?? "").trim(),
    sourcePage: Number.isFinite(Number(o.sourcePage)) ? Number(o.sourcePage) : 0,
    sourceQuote: String(o.sourceQuote ?? "").trim(),
    confidence: Number.isFinite(confidence) ? Math.min(1, Math.max(0, confidence)) : 0.5,
  };
}

export async function extractObservations(file: File): Promise<ExtractionResult> {
  const fileBase64 = await fileToBase64(file);

  const res = await fetch("/api/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileBase64 }),
  });

  const data: unknown = await res.json().catch(() => ({}));
  const payload = (data ?? {}) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(String(payload.error || "تعذّر تحليل التقرير."));
  }

  const observations = Array.isArray(payload.observations)
    ? payload.observations.map(sanitize).filter((o): o is ExtractedObservation => o !== null)
    : [];

  return {
    reportTitle: String(payload.reportTitle ?? "").trim(),
    year: Number.isInteger(payload.year) ? (payload.year as number) : 0,
    notes: String(payload.notes ?? "").trim(),
    observations,
  };
}
