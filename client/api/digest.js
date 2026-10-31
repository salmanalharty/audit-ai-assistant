// حصيلة المشغّل اليومي — تقرؤها المنصة لعرض «ما ينتظر المتابعة اليوم».
import { isStoreConfigured, notConfigured, storeGet, DIGEST_KEY } from "./_store.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (!isStoreConfigured()) {
    notConfigured(res);
    return;
  }
  try {
    const digest = await storeGet(DIGEST_KEY);
    res.status(200).json(digest ?? { empty: true });
  } catch (err) {
    res.status(500).json({ error: err?.message || "تعذّرت قراءة الحصيلة." });
  }
}
