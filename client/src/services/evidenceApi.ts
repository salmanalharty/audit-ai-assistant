// استدعاء /api/evidence + تطهير المخرجات.
//
// كما في الاستخراج: لا نثق بما يعيده النموذج مباشرةً — نُثبّت الحكم والتوصية
// ضمن المجموعات المسموحة قبل عرضهما، فلا تتسرّب قيمة غريبة إلى الواجهة.
import type {
  EvidenceAssessment,
  EvidenceRecommendation,
  EvidenceVerdict,
} from "../types/evidence";
import { EVIDENCE_RECOMMENDATIONS, EVIDENCE_VERDICTS } from "../types/evidence";
import type { EffectiveAction } from "../utils/workflow";
import { formatDate } from "../utils/format";

/** مطابق لـ MAX_EVIDENCE_BYTES و ALLOWED_MEDIA_TYPES في api/_evidence.js */
export const MAX_EVIDENCE_BYTES = 3_000_000;

export const ALLOWED_MEDIA_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
];

export function validateEvidenceFile(file: File): string | null {
  if (!ALLOWED_MEDIA_TYPES.includes(file.type)) {
    return "صيغة الملف غير مدعومة. أرفق PDF أو صورة (PNG/JPEG/WEBP/GIF).";
  }
  if (file.size > MAX_EVIDENCE_BYTES) {
    return `حجم الملف ${(file.size / 1e6).toFixed(1)} ميغابايت ويتجاوز الحد المسموح (${(
      MAX_EVIDENCE_BYTES / 1e6
    ).toFixed(1)} ميغابايت).`;
  }
  return null;
}

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

function strList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((v) => String(v).trim()).filter((v) => v.length > 0)
    : [];
}

export async function checkEvidence(
  file: File,
  action: EffectiveAction
): Promise<EvidenceAssessment> {
  const fileBase64 = await fileToBase64(file);

  const res = await fetch("/api/evidence", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileBase64,
      mediaType: file.type,
      action: {
        obsId: action.obs.obsId,
        title: action.obs.title,
        recommendation: action.obs.recommendation,
        riskLevel: action.obs.riskLevel,
        department: action.obs.department,
        responsible: action.obs.responsible,
        dueDate: formatDate(action.dueDate),
      },
    }),
  });

  const data: unknown = await res.json().catch(() => ({}));
  const payload = (data ?? {}) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(String(payload.error || "تعذّر فحص الدليل."));
  }

  const confidence = Number(payload.confidence);
  return {
    verdict: pickEnum<EvidenceVerdict>(payload.verdict, EVIDENCE_VERDICTS, "غير كافٍ"),
    confidence: Number.isFinite(confidence) ? Math.min(1, Math.max(0, confidence)) : 0.5,
    summary: String(payload.summary ?? "").trim(),
    covered: strList(payload.covered),
    gaps: strList(payload.gaps),
    requestedItems: strList(payload.requestedItems),
    concerns: String(payload.concerns ?? "").trim(),
    recommendation: pickEnum<EvidenceRecommendation>(
      payload.recommendation,
      EVIDENCE_RECOMMENDATIONS,
      "طلب أدلة إضافية"
    ),
  };
}
