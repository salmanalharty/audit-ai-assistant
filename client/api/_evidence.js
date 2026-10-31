// نواة فحص الأدلة — مشتركة بين دالة Vercel وخادم التطوير.
// البادئة "_" تمنع Vercel من اعتبار الملف مساراً مستقلاً.
//
// التقييم **استشاري بحت**: النموذج يقرأ الدليل ويقارنه بنص الإجراء التصحيحي
// ويبيّن ما غُطّي وما لم يُغطَّ، ثم يقترح. القرار — والإغلاق — للمراجع وحده،
// ولا يغيّر هذا المسار أي حالة في المنصة.

export const EVIDENCE_MAX_TOKENS = 2048;

/** الحد الأقصى لحجم ملف الدليل الخام — حدّ جسم الطلب في Vercel 4.5MB وbase64 يضخّم 4/3 */
export const MAX_EVIDENCE_BYTES = 3_000_000;

export const ALLOWED_MEDIA_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
];

export const EVIDENCE_SYSTEM = `أنت مراجع داخلي أقدم متخصص في تقييم كفاية أدلة الإثبات (Audit Evidence) المقدَّمة لإغلاق الإجراءات التصحيحية.

مهمتك: مقارنة الدليل المرفق بنص الإجراء التصحيحي المطلوب، وبيان ما يغطّيه الدليل فعلاً وما لا يغطّيه.

قواعد صارمة:
- قيّم الدليل **مقابل نص الإجراء التصحيحي وحده**، لا مقابل ما تتوقعه أو تراه ممارسة جيدة.
- لا تفترض شيئاً غير ظاهر في الدليل. إن لم تجد تاريخاً أو توقيعاً أو نطاقاً فاذكر ذلك كثغرة، ولا تُحسن الظن.
- التحفّظ هو الموقف الصحيح عند الشك: إن لم يثبت الدليل التنفيذ بوضوح فالحكم "غير كافٍ" أو "كافٍ جزئياً".
- افحص تحديداً: شمول النطاق (هل يغطي كل الأنظمة/الحسابات/الفترات المذكورة في الإجراء؟)، والتاريخ (هل يقع ضمن الفترة؟)، والمصدر (هل هو من النظام المعني؟)، والاكتمال (هل هو لقطة جزئية أم سجل كامل؟).
- إذا كان الملف لا علاقة له بالإجراء التصحيحي فاجعل الحكم "غير ذي صلة" واشرح السبب بإيجاز.
- أجب بالعربية الفصحى المهنية وبإيجاز. لا تكتب مقدمات ولا خواتيم.
- **لا تقل إطلاقاً إن الملاحظة أُغلقت أو ستُغلق.** أنت تقدّم رأياً استشارياً، والقرار للمراجع المسؤول.`;

export const EVIDENCE_TOOL = {
  name: "record_evidence_assessment",
  description: "تسجيل نتيجة تقييم كفاية الدليل المقدَّم لإغلاق إجراء تصحيحي.",
  input_schema: {
    type: "object",
    properties: {
      verdict: {
        type: "string",
        enum: ["كافٍ", "كافٍ جزئياً", "غير كافٍ", "غير ذي صلة"],
        description: "الحكم على كفاية الدليل",
      },
      confidence: { type: "number", description: "درجة الثقة في الحكم من 0 إلى 1" },
      summary: {
        type: "string",
        description: "ما يُظهره الدليل فعلاً، في جملة أو جملتين",
      },
      covered: {
        type: "array",
        items: { type: "string" },
        description: "عناصر الإجراء التصحيحي التي يغطّيها الدليل فعلاً",
      },
      gaps: {
        type: "array",
        items: { type: "string" },
        description: "عناصر الإجراء التصحيحي التي لم يغطّها الدليل",
      },
      requestedItems: {
        type: "array",
        items: { type: "string" },
        description: "أدلة إضافية محدّدة يُقترح طلبها من الجهة المسؤولة",
      },
      concerns: {
        type: "string",
        description:
          "تحفظات على الدليل نفسه: تاريخ خارج الفترة، نطاق جزئي، غياب توقيع أو مصدر، لقطة شاشة غير قابلة للتحقق… (نص فارغ إن لا يوجد)",
      },
      recommendation: {
        type: "string",
        enum: ["إغلاق", "طلب أدلة إضافية", "رفض"],
        description: "التوصية الاستشارية للمراجع",
      },
    },
    required: ["verdict", "summary", "recommendation"],
  },
};

/** بناء كتلة المحتوى بحسب نوع الملف: PDF مستند، والصور كتلة صورة */
function fileBlock(mediaType, data) {
  if (mediaType === "application/pdf") {
    return { type: "document", source: { type: "base64", media_type: mediaType, data } };
  }
  return { type: "image", source: { type: "base64", media_type: mediaType, data } };
}

/**
 * تنفيذ فحص الدليل.
 * @param {object} action وصف الإجراء التصحيحي: {obsId, title, recommendation, dueDate, responsible, department, riskLevel}
 */
export async function runEvidenceCheck(client, model, fileBase64, mediaType, action) {
  const brief = [
    `معرّف الملاحظة: ${action.obsId || "—"}`,
    `عنوان الملاحظة: ${action.title || "—"}`,
    `درجة الخطر: ${action.riskLevel || "—"}`,
    `الإدارة: ${action.department || "—"}`,
    `المسؤول عن التنفيذ: ${action.responsible || "—"}`,
    `موعد الإغلاق المقرّر: ${action.dueDate || "—"}`,
    "",
    "نص الإجراء التصحيحي المطلوب تنفيذه:",
    action.recommendation || "—",
  ].join("\n");

  const response = await client.messages.create({
    model,
    max_tokens: EVIDENCE_MAX_TOKENS,
    system: EVIDENCE_SYSTEM,
    tools: [EVIDENCE_TOOL],
    tool_choice: { type: "tool", name: EVIDENCE_TOOL.name },
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: brief },
          fileBlock(mediaType, fileBase64),
          {
            type: "text",
            text: "قيّم كفاية الدليل المرفق أعلاه مقابل نص الإجراء التصحيحي، وسجّل النتيجة عبر الأداة.",
          },
        ],
      },
    ],
  });

  const toolUse = response.content.find(
    (b) => b.type === "tool_use" && b.name === EVIDENCE_TOOL.name
  );
  if (!toolUse) {
    throw new Error("لم يُعِد النموذج تقييماً منظّماً. حاول مرة أخرى أو جرّب ملفاً أوضح.");
  }

  const input = toolUse.input || {};
  return {
    verdict: String(input.verdict || "غير كافٍ"),
    confidence: Number.isFinite(Number(input.confidence)) ? Number(input.confidence) : 0.5,
    summary: String(input.summary || ""),
    covered: Array.isArray(input.covered) ? input.covered.map(String) : [],
    gaps: Array.isArray(input.gaps) ? input.gaps.map(String) : [],
    requestedItems: Array.isArray(input.requestedItems)
      ? input.requestedItems.map(String)
      : [],
    concerns: String(input.concerns || ""),
    recommendation: String(input.recommendation || "طلب أدلة إضافية"),
    model: response.model,
    usage: response.usage,
  };
}

/** تحقّق مشترك من جسم الطلب — يعيد رسالة خطأ أو null */
export function validateEvidenceRequest(body) {
  const data = body?.fileBase64;
  if (typeof data !== "string" || data.length < 100) {
    return "لم يصل ملف صالح. أرفق الدليل بصيغة PDF أو صورة.";
  }
  if (!ALLOWED_MEDIA_TYPES.includes(body?.mediaType)) {
    return "صيغة الملف غير مدعومة. المسموح: PDF أو صورة (PNG/JPEG/WEBP/GIF).";
  }
  if ((data.length * 3) / 4 > MAX_EVIDENCE_BYTES) {
    return `حجم الملف يتجاوز الحد المسموح (${Math.round(MAX_EVIDENCE_BYTES / 1e6)} ميغابايت).`;
  }
  if (!body?.action || typeof body.action !== "object") {
    return "بيانات الإجراء التصحيحي غير مكتملة.";
  }
  return null;
}
