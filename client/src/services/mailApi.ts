// الإرسال الفعلي للمراسلات — معطّل ما لم يُهيَّأ على الخادم.
//
// الرمز يُحفظ في sessionStorage لا localStorage: ينتهي بإغلاق التبويب،
// فلا يبقى سرّ الإرسال مخزّناً على جهاز مشترك.
const TOKEN_KEY = "audit-ai:mail-token";

export interface SendPayload {
  to: string;
  subject: string;
  html: string;
}

/** هل الإرسال الفعلي مفعّل على هذا النشر؟ */
export async function isSendingEnabled(): Promise<boolean> {
  try {
    const res = await fetch("/api/send-email", { cache: "no-store" });
    if (!res.ok) return false;
    const data = (await res.json()) as { enabled?: boolean };
    return Boolean(data?.enabled);
  } catch {
    return false;
  }
}

export function getMailToken(): string {
  try {
    return sessionStorage.getItem(TOKEN_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setMailToken(token: string): void {
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* تخزين معطّل — نكمل بلا حفظ */
  }
}

export function clearMailToken(): void {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* تجاهل */
  }
}

/** إرسال رسالة واحدة. يرمي خطأً مقروءاً عند الرفض أو فشل الخدمة. */
export async function sendEmail(payload: SendPayload, token: string): Promise<string | null> {
  const res = await fetch("/api/send-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, token }),
  });

  const data = (await res.json().catch(() => ({}))) as { error?: string; id?: string };
  if (!res.ok) {
    throw new Error(data?.error || "تعذّر إرسال الرسالة.");
  }
  return data?.id ?? null;
}
