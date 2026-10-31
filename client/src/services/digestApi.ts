// حصيلة المشغّل اليومي.
export interface DigestItem {
  obsId: string;
  title: string;
  riskLevel: string;
  department: string;
  responsible: string;
  email: string;
  dueDateISO: string;
  overdueDays: number;
  escalated: boolean;
}

export interface DigestGroup {
  responsible: string;
  email: string;
  count: number;
  overdue: number;
  items: DigestItem[];
}

export interface Digest {
  generatedAtISO: string;
  total: number;
  overdue: number;
  dueSoon: number;
  recipients: number;
  groups: DigestGroup[];
}

/** يعيد null إذا لم يكن المشغّل مهيأ أو لم يُشغَّل بعد */
export async function fetchDigest(): Promise<Digest | null> {
  try {
    const res = await fetch("/api/digest", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<Digest> & { empty?: boolean };
    if (data?.empty || !Array.isArray(data?.groups)) return null;
    return data as Digest;
  } catch {
    return null;
  }
}
