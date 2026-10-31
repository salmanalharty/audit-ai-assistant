// خدمة المساعد الذكي: تبني الـ system (دور + بيانات السنة + ملخص) وترسل إلى /api/chat.
import type { AuditOperation, AuditYear } from "../types/audit";
import type { FollowUpObservation } from "../types/followup";
import type { ActionEvent } from "../types/actions";
import { kpiSummary } from "../utils/calculations";
import {
  followKpis,
  openByDepartment,
  repeatFindings,
  unjustifiedList,
  agingList,
} from "../utils/followupCalc";
import { suggestions, workflowKpis, type EffectiveAction } from "../utils/workflow";

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

/** system prompt خاص بصفحة الإجراءات التصحيحية */
export function buildActionsSystemPrompt(
  list: EffectiveAction[],
  events: ActionEvent[]
): string {
  const k = workflowKpis(list);
  const rules = suggestions(list)
    .map((s) => `${s.kind} (${s.obsIds.length}): ${s.rule}`)
    .join("؛ ");
  const worst = [...list]
    .filter((a) => a.isOpen)
    .sort((a, b) => b.overdueDays - a.overdueDays)
    .slice(0, 20)
    .map(
      (a) =>
        `${a.obs.obsId} — ${a.obs.title} — ${a.obs.department} — مسؤول: ${a.obs.responsible} — خطر ${a.obs.riskLevel} — تأخر ${a.overdueDays}ي — حالة ${a.state} — تمديدات ${a.extensions}`
    )
    .join("؛ ");
  const recent = events
    .slice(0, 15)
    .map((e) => `${e.type} على ${e.obsId}: ${e.note}`)
    .join("؛ ");

  return `أنت "Audit AI Assistant"، مساعد ذكي متخصص في المراجعة الداخلية. المستخدم الآن في صفحة "الإجراءات التصحيحية" التي تدير دورة المتابعة (تذكير / تمديد / تصعيد / إغلاق) على ملاحظات المراجعة.
أجب دائماً بالعربية وباحتراف، واستخدم الأرقام من البيانات أدناه فقط. استخدم Markdown (جداول/قوائم) عند الحاجة.

مهم: قرارات الحالة والتصعيد يملكها محرك قواعد حتمي وليس أنت — دورك الشرح والتحليل واقتراح الأولويات وصياغة ما يُطلب منك، لا ادّعاء تنفيذ إجراء. إن طُلب منك تنفيذ إجراء، وضّح أن التنفيذ يتم بتحديد الملاحظات والضغط على زر الإجراء في الصفحة.

ملخص الإجراءات (حسب الفلاتر الحالية):
- الإجمالي: ${k.total}
- قيد التنفيذ: ${k.inProgress} · مغلقة: ${k.closed} (${Math.round(k.closureRate * 100)}%) · مصعّدة: ${k.escalated}
- متأخرة: ${k.delayed} · مستحقة قريباً: ${k.dueSoon} · غير مبررة: ${k.unjustified}

قواعد المحرك المنطبقة حالياً: ${rules || "لا توجد"}

أكثر الإجراءات المفتوحة تأخراً: ${worst || "لا يوجد"}

آخر أحداث سجل التدقيق: ${recent || "لا توجد أحداث بعد"}`;
}

/**
 * تحسين **نثر** المراسلة فقط (التحية/المقدمة/الخاتمة) بالذكاء الاصطناعي.
 *
 * لا يرى النموذج بيانات الملاحظات ولا يُنتج أي جدول — الجدول يُبنى حتمياً في
 * `emailTemplates.ts`. أقصى ما يستطيعه النموذج هو تحسين صياغة فقرتين، فلا
 * يمكنه اختلاق رقم أو تاريخ أو اسم. وعند أي فشل نُرجع النص الأصلي كما هو.
 */
export async function polishEmailProse(
  kind: string,
  recipientName: string,
  count: number,
  intro: string,
  closing: string
): Promise<{ intro: string; closing: string }> {
  const system = `أنت كاتب مراسلات رسمية في إدارة مراجعة داخلية سعودية.
مهمتك: إعادة صياغة فقرتي "المقدمة" و"الخاتمة" في رسالة من نوع «${kind}» لتكون أكثر احترافاً ووضوحاً وإيجازاً.

قيود صارمة:
- العربية الفصحى المهنية، بنبرة محترمة وغير متوعّدة.
- لا تذكر أي رقم أو تاريخ أو اسم ملاحظة أو نسبة لم يُعطَ لك — تفاصيل الإجراءات ترد في جدول يُضاف بعد المقدمة آلياً، فلا تكتب الجدول ولا تلخّصه.
- أبقِ المقدمة مخاطِبة "${recipientName}" واذكر أن التفاصيل في الجدول أدناه.
- عدد الإجراءات هو ${count} — لك أن تذكره أو تتجاهله، ولا تذكر غيره.
- لا تضف توقيعاً غير "إدارة المراجعة الداخلية".
- أعد النتيجة ككائن JSON فقط بالشكل: {"intro":"...","closing":"..."} بلا أي نص قبله أو بعده وبلا أسوار شيفرة.`;

  const user = `المقدمة الحالية:\n${intro}\n\nالخاتمة الحالية:\n${closing}`;
  const raw = await askClaude(system, [{ role: "user", content: user }]);

  const match = /\{[\s\S]*\}/.exec(raw);
  if (!match) return { intro, closing };
  try {
    const parsed = JSON.parse(match[0]) as { intro?: unknown; closing?: unknown };
    return {
      intro: typeof parsed.intro === "string" && parsed.intro.trim() ? parsed.intro : intro,
      closing:
        typeof parsed.closing === "string" && parsed.closing.trim() ? parsed.closing : closing,
    };
  } catch {
    return { intro, closing };
  }
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
