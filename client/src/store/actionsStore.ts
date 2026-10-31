// متجر الإجراءات التصحيحية — منفصل تماماً عن auditStore.
//
// auditStore يحمل بيانات الإكسل (قراءة فقط). هذا المتجر يحمل التجاوزات التي
// ينشئها المستخدم + سجل التدقيق، ويحفظها عبر actionsRepo بعد كل تغيير.
import { create } from "zustand";
import type {
  ActionEvent,
  ActionEventType,
  ActionRecord,
  ActionState,
  ActionsSnapshot,
} from "../types/actions";
import type { FollowUpObservation } from "../types/followup";
import { SNAPSHOT_VERSION } from "../types/actions";
import { actionsRepo, getStorageMode } from "../services/actionsRepo";
import type { StorageMode } from "../services/actionsRepo";
import { formatDate } from "../utils/format";

/** منفّذ الإجراء — ثابت حالياً؛ يصبح المستخدم المسجَّل عند إضافة الهوية */
export const ACTOR = "فريق المراجعة الداخلية";

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `ev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

interface ActionsState {
  records: Record<string, ActionRecord>;
  events: ActionEvent[];
  /** ملاحظات مستخرجة من تقارير PDF — تُدمج مع ملاحظات الإكسل عند العرض */
  imported: FollowUpObservation[];
  /** أين تُحفظ البيانات فعلاً — يُحسم عند أول تحميل */
  storage: StorageMode;
  hydrated: boolean;

  hydrate: () => Promise<void>;
  remind: (ids: string[]) => void;
  escalate: (ids: string[]) => void;
  close: (ids: string[]) => void;
  extend: (ids: string[], newDueDate: Date) => void;
  reopen: (ids: string[]) => void;
  recordEvidence: (obsId: string, note: string) => void;
  addImported: (obs: FollowUpObservation[], reportTitle: string) => void;
  removeImported: (obsId: string) => void;
  resetAll: () => Promise<void>;
}

const EMPTY_EVENTS: ActionEvent[] = [];
const EMPTY_IMPORTED: FollowUpObservation[] = [];

export const useActionsStore = create<ActionsState>((set, get) => {
  function persist() {
    const { records, events, imported } = get();
    const snapshot: ActionsSnapshot = {
      version: SNAPSHOT_VERSION,
      records,
      events,
      imported,
    };
    void actionsRepo.save(snapshot);
  }

  /**
   * تطبيق تغيير على مجموعة ملاحظات مع تسجيل حدث لكل واحدة.
   * `patch` يستقبل السجل الحالي (قد يكون غير موجود) ويعيد الحقول المتغيّرة.
   */
  function apply(
    ids: string[],
    type: ActionEventType,
    patch: (prev: ActionRecord | undefined) => Partial<ActionRecord>,
    note: string
  ) {
    if (ids.length === 0) return;
    const atISO = new Date().toISOString();
    const records = { ...get().records };
    const events: ActionEvent[] = [];

    for (const obsId of ids) {
      const prev = records[obsId];
      records[obsId] = {
        ...prev,
        ...patch(prev),
        obsId,
        updatedISO: atISO,
      };
      events.push({ id: newId(), obsId, type, atISO, actor: ACTOR, note });
    }

    set({ records, events: [...events, ...get().events] });
    persist();
  }

  return {
    records: {},
    events: EMPTY_EVENTS,
    imported: EMPTY_IMPORTED,
    storage: "local",
    hydrated: false,

    hydrate: async () => {
      if (get().hydrated) return;
      const snapshot = await actionsRepo.load();
      set({
        records: snapshot.records,
        events: snapshot.events,
        imported: snapshot.imported,
        storage: getStorageMode(),
        hydrated: true,
      });
    },

    remind: (ids) =>
      apply(
        ids,
        "تذكير",
        () => ({ lastReminderISO: new Date().toISOString() }),
        "إرسال تذكير بموعد الإغلاق"
      ),

    escalate: (ids) =>
      apply(
        ids,
        "تصعيد",
        () => ({
          state: "مصعّدة" as ActionState,
          escalatedAtISO: new Date().toISOString(),
        }),
        "تصعيد إلى الإدارة العليا"
      ),

    close: (ids) =>
      apply(
        ids,
        "إغلاق",
        () => ({
          state: "مغلقة" as ActionState,
          closedAtISO: new Date().toISOString(),
        }),
        "إغلاق الإجراء بعد التحقق من الأدلة"
      ),

    extend: (ids, newDueDate) =>
      apply(
        ids,
        "تمديد",
        (prev) => ({
          dueDateISO: newDueDate.toISOString(),
          extensions: (prev?.extensions ?? 0) + 1,
        }),
        `تمديد موعد الإغلاق حتى ${formatDate(newDueDate)}`
      ),

    reopen: (ids) =>
      apply(
        ids,
        "إعادة فتح",
        () => ({
          state: "قيد التنفيذ" as ActionState,
          closedAtISO: undefined,
          escalatedAtISO: undefined,
        }),
        "إعادة فتح الإجراء"
      ),

    /**
     * تسجيل نتيجة فحص أدلة في سجل التدقيق **دون تغيير أي حالة**.
     * الفحص ملاحظة على الدليل لا إجراء على الملاحظة — فلا نُنشئ له سجل تجاوزات.
     */
    recordEvidence: (obsId, note) => {
      const event: ActionEvent = {
        id: newId(),
        obsId,
        type: "فحص أدلة",
        atISO: new Date().toISOString(),
        actor: ACTOR,
        note,
      };
      set({ events: [event, ...get().events] });
      persist();
    },

    addImported: (obs, reportTitle) => {
      if (obs.length === 0) return;
      const atISO = new Date().toISOString();
      const existing = new Set(get().imported.map((o) => o.obsId));
      const fresh = obs.filter((o) => !existing.has(o.obsId));
      if (fresh.length === 0) return;

      // حدث لكل ملاحظة — يبقى أثر «من أين جاءت هذه الملاحظة» قابلاً للتتبّع
      const events: ActionEvent[] = fresh.map((o) => ({
        id: newId(),
        obsId: o.obsId,
        type: "استيراد",
        atISO,
        actor: ACTOR,
        note: `استُخرجت من تقرير «${reportTitle || "بلا عنوان"}»`,
      }));

      set({
        imported: [...get().imported, ...fresh],
        events: [...events, ...get().events],
      });
      persist();
    },

    removeImported: (obsId) => {
      const { imported, records, events } = get();
      if (!imported.some((o) => o.obsId === obsId)) return;
      const nextRecords = { ...records };
      delete nextRecords[obsId];
      set({
        imported: imported.filter((o) => o.obsId !== obsId),
        records: nextRecords,
        events: events.filter((e) => e.obsId !== obsId),
      });
      persist();
    },

    resetAll: async () => {
      await actionsRepo.clear();
      set({ records: {}, events: EMPTY_EVENTS, imported: EMPTY_IMPORTED });
    },
  };
});
