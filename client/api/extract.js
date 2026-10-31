// Vercel Serverless Function — استخراج الملاحظات من تقرير مراجعة PDF.
// المنطق في _extraction.js ليبقى مطابقاً لما يعمل في خادم التطوير.
import Anthropic from "@anthropic-ai/sdk";
import { runExtraction, validateExtractRequest } from "./_extraction.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(503).json({
      error:
        "مفتاح Anthropic API غير مهيأ. أضِف متغير البيئة ANTHROPIC_API_KEY في إعدادات مشروع Vercel ثم أعد النشر.",
    });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }

  const invalid = validateExtractRequest(body);
  if (invalid) {
    res.status(400).json({ error: invalid });
    return;
  }

  try {
    const client = new Anthropic({ apiKey });
    const model = process.env.CLAUDE_MODEL || "claude-sonnet-4-6";
    const result = await runExtraction(client, model, body.fileBase64);
    res.status(200).json(result);
  } catch (err) {
    const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
    res.status(status).json({
      error:
        err?.error?.error?.message ||
        err?.message ||
        "تعذّر تحليل التقرير. تحقّق من الملف ومن صحة المفتاح.",
    });
  }
}
