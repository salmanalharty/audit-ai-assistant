// أنواع فحص كفاية أدلة الإغلاق.
export type EvidenceVerdict = "كافٍ" | "كافٍ جزئياً" | "غير كافٍ" | "غير ذي صلة";

export type EvidenceRecommendation = "إغلاق" | "طلب أدلة إضافية" | "رفض";

export interface EvidenceAssessment {
  verdict: EvidenceVerdict;
  confidence: number;
  summary: string;
  /** عناصر الإجراء التصحيحي التي يغطّيها الدليل */
  covered: string[];
  /** ما لم يغطّه الدليل */
  gaps: string[];
  /** أدلة إضافية يُقترح طلبها */
  requestedItems: string[];
  /** تحفظات على الدليل نفسه (تاريخ، نطاق، مصدر) */
  concerns: string;
  recommendation: EvidenceRecommendation;
}

export const EVIDENCE_VERDICTS: EvidenceVerdict[] = [
  "كافٍ",
  "كافٍ جزئياً",
  "غير كافٍ",
  "غير ذي صلة",
];

export const EVIDENCE_RECOMMENDATIONS: EvidenceRecommendation[] = [
  "إغلاق",
  "طلب أدلة إضافية",
  "رفض",
];

/** ما يفعله المراجع بعد قراءة التقييم */
export type EvidenceDecision = "close" | "request" | "record";
