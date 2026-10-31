// تخزين مشترك عبر Redis بواجهة REST (Upstash / Vercel KV).
//
// اختيار REST لا SDK: صفر اعتماديات جديدة، ويعمل مع أي من المزودَين لأن
// كليهما يحقن المتغيّرين نفسيهما. وإن لم يُضبَطا تبقى المنصة على تخزين
// المتصفح كما هي — الميزة اختيارية بالكامل ولا تكسر أي نشر قائم.
// تُقرأ عند كل نداء لا عند تحميل الملف: مع ESM تُقيَّم الاستيرادات قبل جسم
// الملف المستورِد، فلو قرأناها مبكراً لسبقت dotenv.config() وجاءت فارغة.
const base = () => process.env.KV_REST_API_URL;
const token = () => process.env.KV_REST_API_TOKEN;

export const STATE_KEY = "audit-ai:actions";
export const DIGEST_KEY = "audit-ai:digest";

export function isStoreConfigured() {
  return Boolean(base() && token());
}

function headers() {
  return { Authorization: `Bearer ${token()}` };
}

/** قراءة قيمة JSON — يعيد null إذا لم تكن موجودة أو تعذّر تحليلها */
export async function storeGet(key) {
  const res = await fetch(`${base()}/get/${encodeURIComponent(key)}`, {
    headers: headers(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`تعذّرت القراءة من التخزين المشترك (${res.status}).`);
  const body = await res.json();
  if (body?.result == null) return null;
  try {
    return JSON.parse(body.result);
  } catch {
    return null;
  }
}

/** كتابة قيمة JSON */
export async function storeSet(key, value) {
  const res = await fetch(`${base()}/set/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });
  if (!res.ok) throw new Error(`تعذّرت الكتابة في التخزين المشترك (${res.status}).`);
}

export async function storeDelete(key) {
  const res = await fetch(`${base()}/del/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: headers(),
  });
  if (!res.ok) throw new Error(`تعذّر الحذف من التخزين المشترك (${res.status}).`);
}

/** رد موحّد عندما لا يكون التخزين المشترك مهيأ */
export function notConfigured(res) {
  res.status(501).json({
    error:
      "التخزين المشترك غير مهيأ. أضِف KV_REST_API_URL و KV_REST_API_TOKEN في إعدادات Vercel لتفعيله.",
    configured: false,
  });
}
