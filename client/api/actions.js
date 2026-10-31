// حالة الإجراءات التصحيحية المشتركة بين كل من يفتح الموقع.
//   GET    → اللقطة المحفوظة (أو لقطة فارغة)
//   PUT    → حفظ لقطة جديدة
//   DELETE → تصفير
// إن لم يُضبط التخزين المشترك يعيد 501، فيرتدّ المتصفح تلقائياً إلى localStorage.
import { isStoreConfigured, notConfigured, storeDelete, storeGet, storeSet, STATE_KEY } from "./_store.js";

const EMPTY = { version: 2, records: {}, events: [], imported: [] };

/** تحقّق من الشكل قبل الحفظ — لا نكتب حمولة عشوائية في تخزين مشترك */
function isSnapshot(v) {
  return (
    v &&
    typeof v === "object" &&
    typeof v.version === "number" &&
    v.records &&
    typeof v.records === "object" &&
    Array.isArray(v.events) &&
    Array.isArray(v.imported)
  );
}

export default async function handler(req, res) {
  if (!isStoreConfigured()) {
    notConfigured(res);
    return;
  }

  try {
    if (req.method === "GET") {
      const snapshot = await storeGet(STATE_KEY);
      res.status(200).json(snapshot ?? EMPTY);
      return;
    }

    if (req.method === "PUT") {
      let body = req.body;
      if (typeof body === "string") {
        try {
          body = JSON.parse(body);
        } catch {
          body = null;
        }
      }
      if (!isSnapshot(body)) {
        res.status(400).json({ error: "لقطة غير صالحة." });
        return;
      }
      await storeSet(STATE_KEY, body);
      res.status(200).json({ ok: true });
      return;
    }

    if (req.method === "DELETE") {
      await storeDelete(STATE_KEY);
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    res.status(500).json({ error: err?.message || "خطأ في التخزين المشترك." });
  }
}
