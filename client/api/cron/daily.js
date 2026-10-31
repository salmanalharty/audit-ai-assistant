// المشغّل اليومي — المقابل الآمن لـ "Daily Trigger" في العرض.
//
// يحسب المستحق والمتأخر، ويجمّعه **حسب المسؤول** (رسالة لكل شخص لا لكل
// ملاحظة)، ويخزّن الحصيلة لتظهر في المنصة. لا يرسل شيئاً: المراجع يفتح
// المسودات ويراجعها ثم يرسل — وهو ما تُظهره شريحة «Review Draft» نفسها.
import { isStoreConfigured, notConfigured, storeGet, storeSet, DIGEST_KEY, STATE_KEY } from "../_store.js";
import { loadFollowUp, quarterEndDate } from "../_followup.js";

/** عدد الأيام حتى موعد الاستحقاق (سالب = متأخر) */
function daysUntil(due, today) {
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}

export default async function handler(req, res) {
  // Vercel يرسل CRON_SECRET في الترويسة إن كان مضبوطاً — نرفض أي نداء آخر
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    res.status(401).json({ error: "غير مصرّح." });
    return;
  }

  if (!isStoreConfigured()) {
    notConfigured(res);
    return;
  }

  try {
    const today = new Date();
    const [rows, snapshot] = await Promise.all([loadFollowUp(), storeGet(STATE_KEY)]);
    const records = snapshot?.records ?? {};

    const due = [];
    for (const row of rows) {
      const rec = records[row.obsId];

      // الحالة الفعلية: ما نفّذه المراجعون في المنصة يتقدّم على ما في الإكسل
      const state = rec?.state ?? (row.status === "مغلقة" ? "مغلقة" : "قيد التنفيذ");
      if (state === "مغلقة") continue;

      const dueDate = rec?.dueDateISO
        ? new Date(rec.dueDateISO)
        : quarterEndDate(row.plannedDate);
      if (!dueDate) continue;

      const remaining = daysUntil(dueDate, today);
      if (remaining > 30) continue; // ليس مستحقاً بعد

      due.push({
        obsId: row.obsId,
        title: row.title,
        riskLevel: row.riskLevel,
        department: row.department,
        responsible: row.responsible || "غير محدد",
        email: row.email,
        dueDateISO: dueDate.toISOString(),
        overdueDays: remaining < 0 ? -remaining : 0,
        escalated: state === "مصعّدة",
      });
    }

    // التجميع حسب المسؤول — جوهر الاختصار الذي يعد به العرض
    const byPerson = new Map();
    for (const item of due) {
      const key = item.email || item.responsible;
      const group = byPerson.get(key);
      group ? group.items.push(item) : byPerson.set(key, {
        responsible: item.responsible,
        email: item.email,
        items: [item],
      });
    }

    const groups = [...byPerson.values()]
      .map((g) => ({
        ...g,
        count: g.items.length,
        overdue: g.items.filter((i) => i.overdueDays > 0).length,
        items: g.items.sort((a, b) => b.overdueDays - a.overdueDays),
      }))
      .sort((a, b) => b.overdue - a.overdue || b.count - a.count);

    const digest = {
      generatedAtISO: today.toISOString(),
      total: due.length,
      overdue: due.filter((i) => i.overdueDays > 0).length,
      dueSoon: due.filter((i) => i.overdueDays === 0).length,
      recipients: groups.length,
      groups,
    };

    await storeSet(DIGEST_KEY, digest);
    res.status(200).json({ ok: true, ...digest, groups: undefined });
  } catch (err) {
    res.status(500).json({ error: err?.message || "تعذّر تشغيل المشغّل اليومي." });
  }
}
