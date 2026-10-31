// إرسال فعلي للمراسلة عبر Resend.
//
// ⚠️ لماذا يوجد رمز إرسال (MAIL_SEND_TOKEN)؟
// الموقع منشور للعموم وبلا تسجيل دخول. لو تُرك الإرسال مفتوحاً لصار أي شخص
// يعثر على الرابط قادراً على إرسال بريد من نطاقك — أي مُرحِّل بريد مفتوح
// (open relay) يصلح للتصيّد والرسائل المزعجة باسمك. لذلك:
//   - الميزة **معطّلة افتراضياً**: بلا متغيّرات بيئة لا إرسال إطلاقاً.
//   - وعند تفعيلها يلزم رمز سرّي لا يعرفه إلا من تعطيه إياه.
// هذا حدّ أدنى لا بديل عنه، وليس بديلاً عن تسجيل دخول حقيقي.
const RESEND_ENDPOINT = "https://api.resend.com/emails";

function isEnabled() {
  return Boolean(
    process.env.RESEND_API_KEY && process.env.MAIL_FROM && process.env.MAIL_SEND_TOKEN
  );
}

/** مقارنة بطول ثابت — لا تكشف الرمز عبر فروق التوقيت */
function tokenMatches(given) {
  const expected = process.env.MAIL_SEND_TOKEN || "";
  const a = String(given ?? "");
  if (a.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= a.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
  // GET = استعلام حالة الميزة، تستخدمه الواجهة لإظهار زر الإرسال أو إخفائه
  if (req.method === "GET") {
    res.status(200).json({ enabled: isEnabled() });
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!isEnabled()) {
    res.status(501).json({
      error:
        "الإرسال الفعلي غير مفعّل. يلزم ضبط RESEND_API_KEY و MAIL_FROM و MAIL_SEND_TOKEN في إعدادات Vercel.",
      enabled: false,
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
  const { to, subject, html, token } = body || {};

  if (!tokenMatches(token)) {
    res.status(403).json({ error: "رمز الإرسال غير صحيح." });
    return;
  }
  if (typeof to !== "string" || !EMAIL_RE.test(to)) {
    res.status(400).json({ error: "عنوان المستلم غير صالح." });
    return;
  }
  if (typeof subject !== "string" || !subject.trim()) {
    res.status(400).json({ error: "موضوع الرسالة مطلوب." });
    return;
  }
  if (typeof html !== "string" || html.length < 20) {
    res.status(400).json({ error: "نص الرسالة مطلوب." });
    return;
  }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: process.env.MAIL_FROM, to: [to], subject, html }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      res.status(response.status).json({
        error: data?.message || `تعذّر الإرسال (${response.status}).`,
      });
      return;
    }

    res.status(200).json({ ok: true, id: data?.id ?? null });
  } catch (err) {
    res.status(500).json({ error: err?.message || "تعذّر الاتصال بخدمة البريد." });
  }
}
