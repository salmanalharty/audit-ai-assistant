// مستودع تخزين الإجراءات التصحيحية.
//
// كل الواجهات تتعامل مع `actionsRepo` فقط ولا تعرف أين تُحفظ البيانات.
// هناك تنفيذان خلف الواجهة نفسها:
//   - محلي  : localStorage — يعمل بلا أي بنية تحتية، والحالة خاصة بكل متصفح.
//   - مشترك : `/api/actions` فوق Redis — الحالة واحدة لكل من يفتح الموقع.
//
// الاختيار **تلقائي**: عند أول تحميل نسأل الخادم؛ إن أجاب فالتخزين مشترك،
// وإن ردّ بـ 501 (غير مهيأ) أو تعذّر الوصول نرتدّ إلى المحلي. بهذا يعمل
// النشر الحالي كما هو، وتكفي إضافة متغيّري البيئة لتفعيل المشاركة.
import type { ActionsSnapshot } from "../types/actions";
import { EMPTY_SNAPSHOT, SNAPSHOT_VERSION } from "../types/actions";

export interface ActionsRepo {
  load(): Promise<ActionsSnapshot>;
  save(snapshot: ActionsSnapshot): Promise<void>;
  clear(): Promise<void>;
}

const STORAGE_KEY = "audit-ai:actions:v1";

/**
 * تحقّق + ترحيل. الترحيل مقصود: المستخدم الذي جرّب المنصة قبل إضافة
 * الاستيراد يجب ألّا يفقد سجلّه لمجرد أن بنية التخزين تغيّرت.
 */
function migrate(value: unknown): ActionsSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const s = value as Partial<ActionsSnapshot>;
  if (
    typeof s.version !== "number" ||
    s.version > SNAPSHOT_VERSION ||
    typeof s.records !== "object" ||
    s.records === null ||
    !Array.isArray(s.events)
  ) {
    return null;
  }
  return {
    version: SNAPSHOT_VERSION,
    records: s.records,
    events: s.events,
    imported: Array.isArray(s.imported) ? s.imported : [], // v1 لم يكن فيه هذا الحقل
  };
}

/** تنفيذ محلي: يحفظ في متصفح المستخدم فقط */
export function createLocalRepo(): ActionsRepo {
  return {
    async load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return EMPTY_SNAPSHOT;
        return migrate(JSON.parse(raw) as unknown) ?? EMPTY_SNAPSHOT;
      } catch {
        // تخزين معطّل (وضع التصفح الخاص) أو بيانات تالفة — نبدأ نظيفين
        return EMPTY_SNAPSHOT;
      }
    },

    async save(snapshot) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
      } catch {
        // تجاهل: فشل الحفظ لا يجوز أن يُسقط الواجهة
      }
    },

    async clear() {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* تجاهل */
      }
    },
  };
}

/** تنفيذ مشترك: يحفظ على الخادم فيراه كل من يفتح الموقع */
export function createRemoteRepo(): ActionsRepo {
  return {
    async load() {
      const res = await fetch(ENDPOINT, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      return migrate((await res.json()) as unknown) ?? EMPTY_SNAPSHOT;
    },

    async save(snapshot) {
      await fetch(ENDPOINT, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(snapshot),
      });
    },

    async clear() {
      await fetch(ENDPOINT, { method: "DELETE" });
    },
  };
}

const ENDPOINT = "/api/actions";

export type StorageMode = "local" | "shared";

let backend: ActionsRepo | null = null;
let mode: StorageMode = "local";

/** وضع التخزين الفعلي — صالح للقراءة بعد أول `load()` */
export function getStorageMode(): StorageMode {
  return mode;
}

/**
 * مستودع هجين: يكتشف الخلفية عند أول تحميل بطلب واحد (لا طلب فحص منفصل)،
 * ثم يوجّه كل العمليات التالية إليها.
 */
export const actionsRepo: ActionsRepo = {
  async load() {
    try {
      const res = await fetch(ENDPOINT, { cache: "no-store" });
      if (res.ok) {
        backend = createRemoteRepo();
        mode = "shared";
        return migrate((await res.json()) as unknown) ?? EMPTY_SNAPSHOT;
      }
    } catch {
      // الخادم غير متاح — نكمل محلياً
    }
    backend = createLocalRepo();
    mode = "local";
    return backend.load();
  },

  async save(snapshot) {
    await (backend ?? createLocalRepo()).save(snapshot);
  },

  async clear() {
    await (backend ?? createLocalRepo()).clear();
  },
};
