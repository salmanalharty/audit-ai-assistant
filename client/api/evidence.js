// Vercel Serverless Function — فحص كفاية أدلة إغلاق إجراء تصحيحي.
// المنطق في _evidence.js ليبقى مطابقاً لما يعمل في خادم التطوير.
import Anthropic from "@anthropic-ai/sdk";
import { runEvidenceCheck, validateEvidenceRequest } from "./_evidence.js";

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

  const invalid = validateEvidenceRequest(body);
  if (invalid) {
    res.status(400).json({ error: invalid });
    return;
  }

  try {
    const client = new Anthropic({ apiKey });
    const model = process.env.CLAUDE_MODEL || "claude-sonnet-4-6";
    const result = await runEvidenceCheck(
      client,
      model,
      body.fileBase64,
      body.mediaType,
      body.action
    );
    res.status(200).json(result);
  } catch (err) {
    const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
    res.status(status).json({
      error:
        err?.error?.error?.message ||
        err?.message ||
        "تعذّر فحص الدليل. تحقّق من الملف ومن صحة المفتاح.",
    });
  }
}
