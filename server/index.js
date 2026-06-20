import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Anthropic from "@anthropic-ai/sdk";

// override: true لأن النظام قد يحتوي ANTHROPIC_API_KEY فارغاً مسبقاً يحجب قيمة .env
dotenv.config({ override: true });

const PORT = process.env.PORT || 8787;
const MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-4-6";
const API_KEY = process.env.ANTHROPIC_API_KEY;

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const client = API_KEY ? new Anthropic({ apiKey: API_KEY }) : null;

// فحص صحة الخادم
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, model: MODEL, hasKey: Boolean(API_KEY) });
});

/**
 * POST /api/chat
 * body: { system: string, messages: [{role, content}] }
 * تمرير آمن لطلبات الشات إلى Claude. المفتاح يبقى على الخادم فقط.
 */
app.post("/api/chat", async (req, res) => {
  if (!client) {
    return res.status(503).json({
      error:
        "مفتاح Anthropic API غير مهيأ على الخادم. ضع ANTHROPIC_API_KEY في ملف server/.env ثم أعد التشغيل.",
    });
  }

  const { system, messages } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages مطلوبة وغير صالحة." });
  }

  try {
    // الـ system يحمل بيانات السنة الكبيرة (ثابتة عبر أسئلة نفس السنة) →
    // نفعّل prompt caching عليه لتقليل الكلفة وزمن الاستجابة عند تكرار الأسئلة.
    const systemBlocks = system
      ? [{ type: "text", text: String(system), cache_control: { type: "ephemeral" } }]
      : undefined;

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: systemBlocks,
      messages,
    });

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    res.json({
      text,
      usage: response.usage,
      model: response.model,
    });
  } catch (err) {
    console.error("Claude API error:", err?.message || err);
    const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
    res.status(status).json({
      error:
        err?.error?.error?.message ||
        err?.message ||
        "تعذّر الاتصال بخدمة Claude. تحقّق من صحة المفتاح والاتصال.",
    });
  }
});

app.listen(PORT, () => {
  console.log(`✓ خادم المساعد الوسيط يعمل على http://localhost:${PORT}`);
  console.log(`  النموذج: ${MODEL} | المفتاح مهيأ: ${Boolean(API_KEY)}`);
});
