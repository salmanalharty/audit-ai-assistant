// خدمة المساعد الذكي: تبني الـ system (دور + بيانات السنة + ملخص) وترسل إلى /api/chat.
import type { AuditOperation, AuditYear } from "../types/audit";
import type { FollowUpObservation } from "../types/followup";
import { kpiSummary } from "../utils/calculations";
import {
  followKpis,
  openByDepartment,
  repeatFindings,
  unjustifiedList,
  agingList,
} from "../utils/followupCalc";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface FilterContext {
  type: string;
  status: string;
}

/** بناء system prompt مدرك للسياق (السنة + الفلاتر المطبّقة) */
export function buildSystemPrompt(
  ops: AuditOperation[],
  year: AuditYear,
  filters: FilterContext
): string {
  const k = kpiSummary(ops);
  // نُهيّئ نسخة مختصرة من البيانات (بدون كائنات Date) لتقليل الحجم
  const compact = ops.map((o) => ({
    رقم: o.id,
    العملية: o.name,
    النوع: o.type,
    الإدارة: o.department,
    المسؤول: o.owner,
    الحالة: o.status,
    مستوى_الخطورة: o.riskLevel,
    درجة_المخاطر: o.riskScore,
    الربع: o.quarter,
    المرحلة: o.phase,
    المدة_المخططة: o.plannedDuration,
    المدة_الفعلية: o.actualDuration,
    أيام_التأخير: o.delayDays,
    نسبة_الإنجاز: Math.round(o.completion * 100) + "%",
    عدد_الملاحظات: o.findings,
    ملاحظات_حرجة: o.criticalFindings,
    إجمالي_التوصيات: o.totalRecs,
    التوصيات_المغلقة: o.closedRecs,
    نسبة_إغلاق_التوصيات: Math.round(o.recClosureRate * 100) + "%",
    تعليقات: o.comments,
  }));

  return `أنت "Audit AI Assistant"، مساعد ذكي متخصص في المراجعة الداخلية والحوكمة.
دورك تحليل بيانات خطة المراجعة والإجابة على أسئلة المستخدم بدقة واحتراف.

التعليمات:
- أجب دائماً باللغة العربية وبأسلوب مهني واضح.
- استخدم الأرقام والإحصائيات من البيانات المرفقة فقط، ولا تختلق بيانات.
- عند طلب مقارنة قدّم جدول Markdown واضح.
- عند طلب اقتراحات قدّم توصيات عملية مبنية على البيانات (مثل ترتيب الأولويات حسب درجة المخاطر).
- استخدم تنسيق Markdown (عناوين، قوائم، جداول) لتنظيم الإجابة.

السياق الحالي:
- السنة المختارة: ${year}
- فلتر النوع المطبّق: ${filters.type}
- فلتر الحالة المطبّق: ${filters.status}

ملخص إحصائي لسنة ${year}:
- إجمالي العمليات: ${k.total}
- المكتملة: ${k.completed}
- تحت التنفيذ: ${k.inProgress}
- المتأخرة: ${k.late}
- لم تبدأ: ${k.notStarted}
- مؤجلة: ${k.postponed}
- نسبة الإنجاز الإجمالية: ${Math.round(k.overall * 100)}%

بيانات خطة المراجعة لسنة ${year} (JSON):
${JSON.stringify(compact, null, 1)}`;
}

/** system prompt خاص بصفحة تقرير المتابعة */
export function buildFollowUpSystemPrompt(obs: FollowUpObservation[]): string {
  const k = followKpis(obs);
  const topDepts = openByDepartment(obs)
    .slice(0, 8)
    .map((d) => `${d.department}: ${d.open}`)
    .join("، ");
  const repeats = repeatFindings(obs)
    .slice(0, 15)
    .map((r) => `"${r.title}" (${r.operationName}) ×${r.count} [${r.years.join("،")}]`)
    .join("؛ ");
  const unjust = unjustifiedList(obs)
    .map((o) => `${o.obsId}: ${o.title} — ${o.department} — خطر ${o.riskLevel} — تأخر ${o.overdueDays}ي`)
    .join("؛ ");
  const aging = agingList(obs)
    .slice(0, 20)
    .map((o) => `${o.obsId} (${o.operationName}): ${o.overdueDays}ي`)
    .join("؛ ");

  return `أنت "Audit AI Assistant"، مساعد ذكي متخصص في المراجعة الداخلية. المستخدم الآن في صفحة "تقرير المتابعة" التي تتتبّع إغلاق ملاحظات المراجعة عبر السنوات 2022–2026.
أجب دائماً بالعربية وباحتراف، واستخدم الأرقام من البيانات أدناه فقط. استخدم Markdown (جداول/قوائم) عند الحاجة.

ملخص تقرير المتابعة (حسب الفلاتر الحالية):
- إجمالي الملاحظات: ${k.total}
- المغلقة: ${k.closed} (${Math.round(k.closureRate * 100)}% نسبة الإغلاق)
- المفتوحة: ${k.open}
- المتأخرة: ${k.overdue} · المؤجلة: ${k.deferred}
- غير المبررة: ${k.unjustified} · عالية الخطورة ومفتوحة: ${k.highRiskOpen}

أكثر الإدارات بملاحظات مفتوحة: ${topDepts || "—"}

الملاحظات المتكررة عبر السنوات (عنوان × عدد التكرارات × عملية): ${repeats || "لا يوجد"}

الملاحظات غير المبررة (تتطلب تصعيداً): ${unjust || "لا يوجد"}

أكثر الملاحظات تأخراً: ${aging || "لا يوجد"}`;
}

export async function askClaude(
  system: string,
  messages: ChatMessage[]
): Promise<string> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, messages }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || "تعذّر الحصول على رد من المساعد.");
  }
  return data.text as string;
}
