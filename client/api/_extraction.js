// نواة استخراج الملاحظات من تقارير المراجعة (PDF) — مشتركة بين:
//   - client/api/extract.js   (دالة Vercel في الإنتاج)
//   - server/index.js         (خادم Express أثناء التطوير)
// البادئة "_" تمنع Vercel من اعتبار الملف مساراً مستقلاً.
//
// لماذا استدعاء واحد بمخرَج منظّم (tool) بدل وكيل مستقل؟ لأن المطلوب مهمة
// استخراج واحدة محدّدة المخرجات؛ الوكيل المستقل يضيف كلفة وزمناً وعدم حتمية
// بلا مقابل، ويصعّب تدقيق ما استُخرج.

export const EXTRACTION_MODEL_MAX_TOKENS = 4096;

/**
 * الحد الأقصى لحجم ملف PDF الخام (قبل base64).
 * حدّ جسم الطلب في Vercel = 4.5MB، وترميز base64 يضخّم الحجم بمقدار 4/3،
 * فـ 3MB خام ≈ 4.0MB مُرمَّزاً + هامش لمظروف JSON.
 */
export const MAX_PDF_BYTES = 3_000_000;

export const EXTRACTION_SYSTEM = `أنت محلل مراجعة داخلية خبير. مهمتك استخراج الملاحظات (Observations/Findings) والإجراءات التصحيحية (Corrective Actions/Recommendations) من تقرير المراجعة المرفق.

قواعد صارمة:
- استخرج فقط ما هو مذكور صراحةً في التقرير. لا تستنتج ولا تضف ولا تكمل نقصاً من عندك.
- إن لم تجد قيمة لحقل ما، اتركه نصاً فارغاً "" — لا تخمّن ولا تضع قيمة افتراضية.
- اكتب "عنوان الملاحظة" و"الإجراء التصحيحي" بالعربية الفصحى. إن كان التقرير بالإنجليزية فترجمهما ترجمة أمينة حرفية المعنى دون إضافة أو تفسير.
- لكل ملاحظة ضع "sourceQuote": اقتباساً حرفياً قصيراً (سطر واحد) من نص التقرير بلغته الأصلية كما ورد، ليتمكّن المراجع من التحقق. لا تترجم هذا الاقتباس.
- ضع "sourcePage": رقم الصفحة التي وردت فيها الملاحظة.
- "confidence": ثقتك في دقة الاستخراج من 0 إلى 1. اخفضها عند الغموض أو عند بناء الحقل على استنتاج جزئي.
- إذا كانت الملاحظة الواحدة لها عدة إجراءات تصحيحية، أدرجها جميعاً في الحقل نفسه مفصولة بـ " • ".
- إذا لم يكن المستند تقرير مراجعة أصلاً، أعد مصفوفة observations فارغة واذكر السبب في notes.`;

export const EXTRACTION_TOOL = {
  name: "record_observations",
  description:
    "تسجيل الملاحظات والإجراءات التصحيحية المستخرجة من تقرير المراجعة الداخلية.",
  input_schema: {
    type: "object",
    properties: {
      reportTitle: {
        type: "string",
        description: "عنوان التقرير كما ورد في صفحته الأولى",
      },
      year: {
        type: "integer",
        description: "سنة إصدار التقرير (0 إذا لم تُذكر)",
      },
      notes: {
        type: "string",
        description: "ملاحظة موجزة للمراجع عند وجود غموض أو إذا لم يكن المستند تقرير مراجعة",
      },
      observations: {
        type: "array",
        description: "قائمة الملاحظات المستخرجة",
        items: {
          type: "object",
          properties: {
            title: { type: "string", description: "عنوان الملاحظة بالعربية" },
            recommendation: {
              type: "string",
              description: "الإجراء التصحيحي / التوصية بالعربية",
            },
            riskLevel: {
              type: "string",
              enum: ["عالي", "متوسط", "منخفض"],
              description: "درجة الخطر كما صُنّفت في التقرير",
            },
            auditType: {
              type: "string",
              enum: ["تقنية معلومات", "مالية", "مؤسسية"],
              description: "نوع المراجعة المستنتج من موضوع الملاحظة",
            },
            department: {
              type: "string",
              description: "الإدارة/الجهة المسؤولة كما وردت",
            },
            responsible: {
              type: "string",
              description: "اسم المسؤول عن التنفيذ كما ورد",
            },
            dueDate: {
              type: "string",
              description: 'موعد الإغلاق كما ورد — بصيغة "Qx YYYY" أو "YYYY-MM-DD" أو ""',
            },
            sourcePage: { type: "integer", description: "رقم الصفحة في التقرير" },
            sourceQuote: {
              type: "string",
              description: "اقتباس حرفي قصير من التقرير بلغته الأصلية",
            },
            confidence: {
              type: "number",
              description: "درجة الثقة من 0 إلى 1",
            },
          },
          required: ["title", "recommendation", "riskLevel"],
        },
      },
    },
    required: ["observations"],
  },
};

/**
 * تنفيذ الاستخراج على ملف PDF بصيغة base64.
 * @returns {Promise<{reportTitle:string, year:number, notes:string, observations:Array, model:string, usage:object}>}
 */
export async function runExtraction(client, model, pdfBase64) {
  const response = await client.messages.create({
    model,
    max_tokens: EXTRACTION_MODEL_MAX_TOKENS,
    system: EXTRACTION_SYSTEM,
    tools: [EXTRACTION_TOOL],
    // نُجبر النموذج على استخدام الأداة — فلا يعود بنص حر يصعب تحليله
    tool_choice: { type: "tool", name: EXTRACTION_TOOL.name },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: pdfBase64 },
          },
          {
            type: "text",
            text: "استخرج جميع الملاحظات والإجراءات التصحيحية من هذا التقرير وسجّلها عبر الأداة.",
          },
        ],
      },
    ],
  });

  const toolUse = response.content.find(
    (b) => b.type === "tool_use" && b.name === EXTRACTION_TOOL.name
  );
  if (!toolUse) {
    throw new Error("لم يُعِد النموذج مخرجاً منظّماً. حاول مرة أخرى أو جرّب تقريراً أوضح.");
  }

  const input = toolUse.input || {};
  return {
    reportTitle: String(input.reportTitle || ""),
    year: Number.isInteger(input.year) ? input.year : 0,
    notes: String(input.notes || ""),
    observations: Array.isArray(input.observations) ? input.observations : [],
    model: response.model,
    usage: response.usage,
  };
}

/** تحقّق مشترك من جسم الطلب — يعيد رسالة خطأ أو null */
export function validateExtractRequest(body) {
  const data = body?.fileBase64;
  if (typeof data !== "string" || data.length < 100) {
    return "لم يصل ملف صالح. أرفق تقرير مراجعة بصيغة PDF.";
  }
  // كل 4 أحرف base64 ≈ 3 بايت
  if ((data.length * 3) / 4 > MAX_PDF_BYTES) {
    return `حجم الملف يتجاوز الحد المسموح (${Math.round(MAX_PDF_BYTES / 1e6)} ميغابايت).`;
  }
  return null;
}
