// أنواع استخراج الملاحظات من تقارير المراجعة (PDF).
import type { AuditType, RiskLevel } from "./audit";

/** ملاحظة واحدة كما أعادها النموذج — قبل مراجعة المستخدم واعتمادها */
export interface ExtractedObservation {
  title: string;
  recommendation: string;
  riskLevel: RiskLevel;
  auditType: AuditType;
  department: string;
  responsible: string;
  email: string;
  /** "Qx YYYY" أو "YYYY-MM-DD" أو "" */
  dueDate: string;
  sourcePage: number;
  /** اقتباس حرفي من التقرير — وسيلة المراجع للتحقق من صحة الاستخراج */
  sourceQuote: string;
  /** ثقة النموذج 0..1 */
  confidence: number;
}

export interface ExtractionResult {
  reportTitle: string;
  year: number;
  notes: string;
  observations: ExtractedObservation[];
}

/** ثقة أقل من هذا الحد تُبرز للمراجع ولا تُحدَّد للاعتماد تلقائياً */
export const LOW_CONFIDENCE = 0.7;
