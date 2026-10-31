import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Anthropic from "@anthropic-ai/sdk";
// نفس النواة التي تستخدمها دالة Vercel — حتى لا يختلف سلوك التطوير عن الإنتاج
import { runExtraction, validateExtractRequest } from "../client/api/_extraction.js";
import { runEvidenceCheck, validateEvidenceRequest } from "../client/api/_evidence.js";
// معالجات Vercel نفسها تُركَّب هنا كما هي: توقيع (req, res) متوافق مع Express،
// فيتطابق سلوك التطوير مع الإنتاج بلا سطر منطق مكرّر.
import actionsHandler from "../client/api/actions.js";
import digestHandler from "../client/api/digest.js";
import sendEmailHandler from "../client/api/send-email.js";
import cronDailyHandler from "../client/api/cron/daily.js";

// override: true لأن النظام قد يحتوي ANTHROPIC_API_KEY فارغاً مسبقاً يحجب قيمة .env
dotenv.config({ override: true });

const PORT = process.env.PORT || 8787;
const MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-4-6";
const API_KEY = process.env.ANTHROPIC_API_KEY;

const app = express();
app.use(cors());
// 6mb: ملف PDF بحجم 3.5MB يصبح ≈ 4.7MB بعد ترميز base64
app.use(express.json({ limit: "6mb" }));

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

/**
 * POST /api/extract
 * body: { fileBase64: string }
 * يستخرج الملاحظات والإجراءات التصحيحية من تقرير مراجعة PDF بمخرَج منظّم.
 */
app.post("/api/extract", async (req, res) => {
  if (!client) {
    return res.status(503).json({
      error:
        "مفتاح Anthropic API غير مهيأ على الخادم. ضع ANTHROPIC_API_KEY في ملف server/.env ثم أعد التشغيل.",
    });
  }

  const invalid = validateExtractRequest(req.body);
  if (invalid) return res.status(400).json({ error: invalid });

  try {
    const result = await runExtraction(client, MODEL, req.body.fileBase64);
    console.log(
      `✓ استخراج: ${result.observations.length} ملاحظة من "${result.reportTitle}"`
    );
    res.json(result);
  } catch (err) {
    console.error("Extraction error:", err?.message || err);
    const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
    res.status(status).json({
      error:
        err?.error?.error?.message ||
        err?.message ||
        "تعذّر تحليل التقرير. تحقّق من الملف ومن صحة المفتاح.",
    });
  }
});

/**
 * POST /api/evidence
 * body: { fileBase64: string, mediaType: string, action: object }
 * يقيّم كفاية الدليل المرفق مقابل نص الإجراء التصحيحي — تقييم استشاري لا يغيّر أي حالة.
 */
app.post("/api/evidence", async (req, res) => {
  if (!client) {
    return res.status(503).json({
      error:
        "مفتاح Anthropic API غير مهيأ على الخادم. ضع ANTHROPIC_API_KEY في ملف server/.env ثم أعد التشغيل.",
    });
  }

  const invalid = validateEvidenceRequest(req.body);
  if (invalid) return res.status(400).json({ error: invalid });

  try {
    const result = await runEvidenceCheck(
      client,
      MODEL,
      req.body.fileBase64,
      req.body.mediaType,
      req.body.action
    );
    console.log(
      `✓ فحص أدلة: ${req.body.action?.obsId} → ${result.verdict} (${result.recommendation})`
    );
    res.json(result);
  } catch (err) {
    console.error("Evidence error:", err?.message || err);
    const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
    res.status(status).json({
      error:
        err?.error?.error?.message ||
        err?.message ||
        "تعذّر فحص الدليل. تحقّق من الملف ومن صحة المفتاح.",
    });
  }
});

// المرحلة 5: تخزين مشترك + مشغّل يومي + إرسال فعلي
app.all("/api/actions", (req, res) => actionsHandler(req, res));
app.get("/api/digest", (req, res) => digestHandler(req, res));
app.all("/api/send-email", (req, res) => sendEmailHandler(req, res));
app.get("/api/cron/daily", (req, res) => cronDailyHandler(req, res));

app.listen(PORT, () => {
  console.log(`✓ خادم المساعد الوسيط يعمل على http://localhost:${PORT}`);
  console.log(`  النموذج: ${MODEL} | المفتاح مهيأ: ${Boolean(API_KEY)}`);
});
