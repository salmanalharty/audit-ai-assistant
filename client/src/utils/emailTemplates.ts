// قوالب مراسلات المتابعة + توليد ملفات .eml.
//
// مبدأ التصميم الحاكم: **النثر منفصل عن البيانات**.
//   - النثر (التحية/المقدمة/الخاتمة) نص حر — يجوز للذكاء الاصطناعي تحسينه.
//   - الجدول يُبنى هنا حتمياً من بيانات الملاحظات — ولا يمرّ على أي نموذج لغوي.
// بهذا يستحيل أن يُختلق رقم أو تاريخ أو اسم داخل المراسلة.
import type { ActionKind } from "../types/actions";
import type { EffectiveAction } from "../utils/workflow";
import { formatDate } from "./format";

export interface EmailDraft {
  /** مفتاح ثابت = بريد المستلم */
  key: string;
  recipientName: string;
  recipientEmail: string;
  subject: string;
  /** نص قابل للتحرير — يسبق الجدول */
  intro: string;
  /** نص قابل للتحرير — يلي الجدول */
  closing: string;
  rows: EffectiveAction[];
}

/** أنواع الإجراءات التي تُنتج مراسلة (إعادة الفتح إجراء داخلي بلا مراسلة) */
export const EMAILABLE: ActionKind[] = ["تذكير", "تمديد", "تصعيد", "إغلاق"];

export function hasEmail(kind: ActionKind): boolean {
  return EMAILABLE.includes(kind);
}

// ===== النصوص الافتراضية لكل نوع =====

const SUBJECT: Record<string, string> = {
  تذكير: "متابعة الإجراءات التصحيحية",
  تمديد: "طلب تمديد موعد إغلاق إجراءات تصحيحية",
  تصعيد: "تصعيد إجراءات تصحيحية متأخرة",
  "إغلاق": "إشعار إغلاق إجراءات تصحيحية",
};

const INTRO: Record<string, string> = {
  تذكير:
    "نأمل أن تكونوا بخير.\n\nفيما يلي الإجراءات التصحيحية المفتوحة المسجّلة باسمكم وفق آخر متابعة. نأمل تزويدنا بآخر المستجدات والمدة المتوقعة للإنجاز.",
  تمديد:
    "نأمل أن تكونوا بخير.\n\nبناءً على الطلب المقدّم، نرفع لكم طلب تمديد موعد إغلاق الإجراءات التصحيحية التالية، ومرفق أدناه الموعد السابق والموعد الجديد المقترح لكل إجراء.",
  تصعيد:
    "نأمل أن تكونوا بخير.\n\nنرفع لكم الإجراءات التصحيحية التالية التي تجاوزت موعد إغلاقها المقرّر دون إغلاق أو مبرر مقبول، وذلك لاتخاذ ما ترونه مناسباً.",
  "إغلاق":
    "نأمل أن تكونوا بخير.\n\nنشكر لكم وللفريق جهودكم. بناءً على الأدلة التي تمّت مشاركتها، تم إغلاق الإجراءات التصحيحية التالية وتحديث حالتها في سجل المتابعة.",
};

const CLOSING: Record<string, string> = {
  تذكير: "شاكرين لكم تعاونكم.\n\nإدارة المراجعة الداخلية",
  تمديد:
    "نأمل التكرم بالاطلاع وإفادتنا بالقرار.\n\nوتقبلوا خالص التقدير،\nإدارة المراجعة الداخلية",
  تصعيد:
    "نأمل التكرم بالتوجيه بما ترونه مناسباً.\n\nوتقبلوا خالص التقدير،\nإدارة المراجعة الداخلية",
  "إغلاق": "ولكم جزيل الشكر.\n\nإدارة المراجعة الداخلية",
};

// ===== بناء المسودات =====

/** عنوان العمود الإضافي الخاص بكل نوع (إن وُجد) */
function extraColumns(kind: ActionKind): string[] {
  if (kind === "تمديد") return ["الموعد السابق", "الموعد الجديد"];
  if (kind === "إغلاق") return ["الحالة"];
  return ["تاريخ الاستحقاق", "أيام التأخر"];
}

function extraValues(kind: ActionKind, a: EffectiveAction): string[] {
  if (kind === "تمديد") {
    return [formatDate(a.originalDueDate), formatDate(a.dueDate)];
  }
  if (kind === "إغلاق") return [a.state];
  return [formatDate(a.dueDate), String(a.overdueDays)];
}

/** صياغة العدد صياغة عربية سليمة (مفرد/مثنى/جمع قلة/تمييز مفرد) */
function countLabel(n: number): string {
  if (n === 1) return "إجراء واحد";
  if (n === 2) return "إجراءان";
  if (n <= 10) return `${n} إجراءات`;
  return `${n} إجراءً`;
}

/**
 * تجميع الملاحظات حسب المسؤول عن التنفيذ — رسالة واحدة لكل مستلم،
 * وهو ما يختصر الجهد اليدوي الأكبر في المتابعة (رسالة لكل شخص لا لكل ملاحظة).
 */
export function buildDrafts(kind: ActionKind, rows: EffectiveAction[]): EmailDraft[] {
  const groups = new Map<string, EffectiveAction[]>();
  for (const a of rows) {
    const key = a.obs.email || a.obs.responsible || "—";
    const list = groups.get(key);
    list ? list.push(a) : groups.set(key, [a]);
  }

  return [...groups.entries()]
    .map(([key, list]) => ({
      key,
      recipientName: list[0].obs.responsible || "—",
      recipientEmail: list[0].obs.email || "",
      subject: `${SUBJECT[kind]} — ${countLabel(list.length)}`,
      intro: `عزيزي/عزيزتي ${list[0].obs.responsible}،\n\n${INTRO[kind]}`,
      closing: CLOSING[kind],
      rows: list,
    }))
    .sort((a, b) => b.rows.length - a.rows.length);
}

// ===== التصيير =====

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** الجدول الحتمي — نفس أعمدة تقارير المتابعة المعتمدة */
export function draftTableHtml(kind: ActionKind, rows: EffectiveAction[]): string {
  const heads = [
    "السنة",
    "رقم الملاحظة",
    "عنوان الملاحظة",
    "درجة الخطر",
    "الإجراء التصحيحي",
    ...extraColumns(kind),
  ];

  const body = rows
    .map((a) => {
      const cells = [
        String(a.obs.year),
        a.obs.obsId,
        a.obs.title,
        a.obs.riskLevel,
        a.obs.recommendation,
        ...extraValues(kind, a),
      ];
      return `<tr>${cells.map((c) => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`;
    })
    .join("");

  return `<table><thead><tr>${heads
    .map((h) => `<th>${escapeHtml(h)}</th>`)
    .join("")}</tr></thead><tbody>${body}</tbody></table>`;
}

const STYLE = `body{font-family:'IBM Plex Sans Arabic',Tahoma,Arial,sans-serif;color:#1e293b;font-size:14px;line-height:1.8}
table{width:100%;border-collapse:collapse;margin:14px 0;font-size:12px}
th,td{border:1px solid #cbd5e1;padding:6px 8px;text-align:right;vertical-align:top}
th{background:#1f3864;color:#fff;font-weight:600}
tr:nth-child(even) td{background:#f1f5f9}
p{margin:8px 0;white-space:pre-line}`;

/** جسم الرسالة كاملاً بصيغة HTML (للمعاينة وللملف .eml) */
export function draftHtml(kind: ActionKind, d: EmailDraft): string {
  return `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><style>${STYLE}</style></head><body>
<p>${escapeHtml(d.intro)}</p>
${draftTableHtml(kind, d.rows)}
<p>${escapeHtml(d.closing)}</p>
</body></html>`;
}

/** نسخة نصية (للنسخ إلى الحافظة ولروابط mailto) */
export function draftPlainText(kind: ActionKind, d: EmailDraft): string {
  const lines = d.rows.map((a) => {
    const extra = extraColumns(kind)
      .map((h, i) => `${h}: ${extraValues(kind, a)[i]}`)
      .join(" · ");
    return `• ${a.obs.obsId} — ${a.obs.title} (خطر ${a.obs.riskLevel})\n  الإجراء: ${a.obs.recommendation}\n  ${extra}`;
  });
  return `${d.intro}\n\n${lines.join("\n\n")}\n\n${d.closing}`;
}

// ===== توليد ملف .eml =====

/** ترميز base64 لنص UTF-8 (btoa لا يقبل الحروف العربية مباشرة) */
function utf8ToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/** ترميز عنوان الرسالة وفق RFC 2047 — بدونه يظهر الموضوع العربي مشوّهاً */
function encodeHeader(text: string): string {
  return `=?UTF-8?B?${utf8ToBase64(text)}?=`;
}

/**
 * ملف .eml قابل للفتح مباشرة في Outlook كمسودة (X-Unsent: 1).
 * لا يُرسل شيئاً — المستخدم هو من يضغط «إرسال» في برنامج بريده.
 */
export function draftToEml(kind: ActionKind, d: EmailDraft): string {
  const html = draftHtml(kind, d);
  const b64 = utf8ToBase64(html).replace(/(.{76})/g, "$1\r\n");
  const to = d.recipientEmail
    ? `${encodeHeader(d.recipientName)} <${d.recipientEmail}>`
    : encodeHeader(d.recipientName);

  return [
    `To: ${to}`,
    `Subject: ${encodeHeader(d.subject)}`,
    "X-Unsent: 1",
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=utf-8",
    "Content-Transfer-Encoding: base64",
    "",
    b64,
    "",
  ].join("\r\n");
}

/** تنزيل المسودة كملف .eml */
export function downloadEml(kind: ActionKind, d: EmailDraft): void {
  const blob = new Blob([draftToEml(kind, d)], { type: "message/rfc822" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${kind}-${d.recipientName}.eml`.replace(/\s+/g, "_");
  a.click();
  URL.revokeObjectURL(url);
}

/** رابط mailto — يفتح برنامج البريد بالموضوع والنص جاهزين (بلا إرسال) */
export function mailtoUrl(kind: ActionKind, d: EmailDraft): string {
  const body = draftPlainText(kind, d);
  return `mailto:${encodeURIComponent(d.recipientEmail)}?subject=${encodeURIComponent(
    d.subject
  )}&body=${encodeURIComponent(body)}`;
}
