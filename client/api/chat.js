// Vercel Serverless Function — بديل خادم Express في الإنتاج.
// يستقبل { system, messages } ويستدعي Claude بأمان (المفتاح من متغيرات بيئة Vercel).
import Anthropic from "@anthropic-ai/sdk";

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

  // Vercel يحلّل JSON تلقائياً، مع احتياط لتحليل النص اليدوي
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  const { system, messages } = body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "messages مطلوبة وغير صالحة." });
    return;
  }

  try {
    const client = new Anthropic({ apiKey });
    const model = process.env.CLAUDE_MODEL || "claude-sonnet-4-6";
    const systemBlocks = system
      ? [{ type: "text", text: String(system), cache_control: { type: "ephemeral" } }]
      : undefined;

    const response = await client.messages.create({
      model,
      max_tokens: 1024,
      system: systemBlocks,
      messages,
    });

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    res.status(200).json({ text, model: response.model });
  } catch (err) {
    const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
    res.status(status).json({
      error:
        err?.error?.error?.message ||
        err?.message ||
        "تعذّر الاتصال بخدمة Claude. تحقّق من صحة المفتاح.",
    });
  }
}
