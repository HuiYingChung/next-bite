import { createEmptyMeal, mealNames } from "./data";
import {
  getBrowserStorage,
  LAUNCH_STORAGE_KEY,
  LEGACY_STORAGE_KEYS,
  loadLaunchState,
  MAX_PLANNED_MEALS,
  normalizeMealEntry,
  normalizeState,
  type LaunchState,
  type LocalStorageAccess,
} from "./launch-state";

export const RECORD_DATABASE_NAME = "next-bite-records-v1";
const STORE_NAME = "records";
const STATE_KEY = "current";
const SIGNAL_KEY = "next-bite-records-changed";

export type RecordSaveResult =
  | { status: "ok"; state: LaunchState }
  | { status: "conflict" | "expired"; state: LaunchState; conflicts: string[] }
  | { status: "save-error" };
export type RecordLoadResult = {
  status: "ok" | "save-error";
  state: LaunchState;
};

// Object key order is not meaningful for imported or structured-cloned data.
const canonical = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const item = value as Record<string, unknown>;
    return `{${Object.keys(item).sort().map((key) => `${JSON.stringify(key)}:${canonical(item[key])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "undefined";
};
const equal = (left: unknown, right: unknown) => canonical(left) === canonical(right);
const dataOnly = ({ profile, days, plannedMeals }: LaunchState) => ({
  profile,
  days: days.map(({ date, todayLog }) => ({ date, todayLog })),
  plannedMeals,
});

/** Merge only edits, using the editor's original values as compare-and-set guards. */
export const mergeRecordChanges = (
  current: LaunchState,
  previous: LaunchState,
  next: LaunchState,
  now: Date,
): Exclude<RecordSaveResult, { status: "save-error" }> => {
  const merged = normalizeState(current, now);
  const conflicts: string[] = [];
  const expired: string[] = [];
  // Compare unrolled input first: otherwise an edit to an expired date vanishes.
  for (const day of next.days) {
    const oldDay = previous.days.find((item) => item.date === day.date);
    const currentDay = merged.days.find((item) => item.date === day.date);
    for (const slot of mealNames) {
      const oldMeal = normalizeMealEntry(oldDay?.todayLog[slot] ?? createEmptyMeal());
      const newMeal = normalizeMealEntry(day.todayLog[slot]);
      if (equal(oldMeal, newMeal)) continue;
      const key = `meal:${day.date}:${slot}`;
      if (!currentDay) {
        expired.push(key);
      } else if (!equal(currentDay.todayLog[slot], oldMeal) && !equal(currentDay.todayLog[slot], newMeal)) {
        conflicts.push(key);
      } else {
        currentDay.todayLog[slot] = newMeal;
      }
    }
  }
  const oldProfile = normalizeState(previous, now).profile;
  const newProfile = normalizeState(next, now).profile;
  for (const key of Object.keys(newProfile) as (keyof LaunchState["profile"])[]) {
    if (equal(oldProfile[key], newProfile[key])) continue;
    if (!equal(merged.profile[key], oldProfile[key]) && !equal(merged.profile[key], newProfile[key])) {
      conflicts.push(`profile:${key}`);
    } else {
      Object.assign(merged.profile, { [key]: newProfile[key] });
    }
  }
  const oldPlans = normalizeState(previous, now).plannedMeals;
  const newPlans = normalizeState(next, now).plannedMeals;
  const planIds = new Set([...oldPlans, ...newPlans].map((plan) => plan.id));
  for (const id of planIds) {
    const oldPlan = oldPlans.find((plan) => plan.id === id);
    const newPlan = newPlans.find((plan) => plan.id === id);
    if (equal(oldPlan, newPlan)) continue;
    const savedPlan = merged.plannedMeals.find((plan) => plan.id === id);
    if (!equal(savedPlan, oldPlan) && !equal(savedPlan, newPlan)) {
      conflicts.push(`plan:${id}`);
      continue;
    }
    merged.plannedMeals = merged.plannedMeals.filter((plan) => plan.id !== id);
    if (newPlan) merged.plannedMeals.push(newPlan);
  }
  // Concurrent additions must not silently disappear through normalizer limits.
  const mealIds = merged.plannedMeals.map((plan) => plan.mealId);
  if (merged.plannedMeals.length > MAX_PLANNED_MEALS || new Set(mealIds).size !== mealIds.length) {
    conflicts.push("plans:capacity-or-duplicate");
  }
  if (expired.length) return { status: "expired", state: normalizeState(current, now), conflicts: expired };
  if (conflicts.length) return { status: "conflict", state: normalizeState(current, now), conflicts };
  // Day selection is view state, not a user-record conflict.
  if (next.selectedDayId !== previous.selectedDayId) merged.selectedDayId = next.selectedDayId;
  return { status: "ok", state: normalizeState(merged, now) };
};

export const replaceRecordChanges = (
  current: LaunchState,
  previous: LaunchState,
  next: LaunchState,
  now: Date,
): Exclude<RecordSaveResult, { status: "save-error" }> => {
  const saved = normalizeState(current, now);
  if (!equal(dataOnly(saved), dataOnly(normalizeState(previous, now)))) {
    return { status: "conflict", state: saved, conflicts: ["all-records"] };
  }
  return { status: "ok", state: normalizeState(next, now) };
};

type RecordStoreOptions = {
  databaseName?: string;
  indexedDB?: IDBFactory | null;
  legacyStorage?: LocalStorageAccess | null;
  clock?: () => Date;
};

/** One readwrite transaction serializes reads, guards and writes across tabs. */
export const createRecordStore = (options: RecordStoreOptions = {}) => {
  const databaseName = options.databaseName ?? RECORD_DATABASE_NAME;
  const clock = options.clock ?? (() => new Date());
  const legacyStorage = () => options.legacyStorage === undefined ? getBrowserStorage() : options.legacyStorage;
  let connection: Promise<IDBDatabase> | undefined;
  let channel: BroadcastChannel | undefined;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());
  const getChannel = () => {
    if (!channel && typeof window !== "undefined" && typeof BroadcastChannel !== "undefined") {
      try {
        channel = new BroadcastChannel(databaseName);
        channel.onmessage = notify;
      } catch { /* Focus refresh still works when cross-tab messaging is blocked. */ }
    }
    return channel;
  };
  const publish = () => {
    try { getChannel()?.postMessage("changed"); } catch { /* Persistence already succeeded. */ }
    try { legacyStorage()?.setItem(SIGNAL_KEY, `${Date.now()}:${Math.random()}`); } catch { /* Optional notification only. */ }
  };
  const retireLegacySnapshots = () => {
    for (const key of [LAUNCH_STORAGE_KEY, ...LEGACY_STORAGE_KEYS]) {
      try { legacyStorage()?.removeItem(key); } catch { /* The IDB record is already authoritative. */ }
    }
  };
  const open = (): Promise<IDBDatabase> => {
    if (connection) return connection;
    connection = new Promise<IDBDatabase>((resolve, reject) => {
      const factory = options.indexedDB === undefined ? globalThis.indexedDB : options.indexedDB;
      if (!factory) { reject(new Error("Local database unavailable")); return; }
      const request = factory.open(databaseName, 1);
      let failed = false;
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
      };
      request.onerror = () => reject(request.error);
      request.onblocked = () => { failed = true; reject(new Error("Local database is blocked")); };
      request.onsuccess = () => {
        if (failed) { request.result.close(); return; }
        request.result.onversionchange = () => { request.result.close(); connection = undefined; };
        resolve(request.result);
      };
    }).catch((error: unknown) => { connection = undefined; throw error; });
    return connection;
  };
  const transact = async (
    apply?: (current: LaunchState, now: Date) => Exclude<RecordSaveResult, { status: "save-error" }>,
  ): Promise<RecordSaveResult> => {
    try {
      const database = await open();
      return await new Promise<RecordSaveResult>((resolve) => {
        const transaction = database.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        let result: RecordSaveResult = { status: "save-error" };
        let written = false;
        const request = store.get(STATE_KEY);
        request.onsuccess = () => {
          try {
            // Sample after this transaction receives its serialized turn. A tab
            // that waited across midnight must validate against the new date.
            const now = clock();
            const envelope: unknown = request.result;
            if (envelope !== undefined) {
              if (envelope === null || typeof envelope !== "object" || !("version" in envelope) || envelope.version !== 1 || !("state" in envelope)) {
                throw new Error("Unsupported local database record");
              }
              const saved = envelope.state;
              if (saved === null || typeof saved !== "object" || !("days" in saved) || !Array.isArray(saved.days)) {
                throw new Error("Invalid local database state");
              }
            }
            const current = envelope === undefined
              ? loadLaunchState(legacyStorage(), now)
              : normalizeState((envelope as { state: unknown }).state, now);
            result = apply ? apply(current, now) : { status: "ok", state: current };
            if (result.status === "ok") {
              // Keep a blank record on clear, preventing old snapshots from
              // being reimported even when their removal is blocked.
              store.put({ version: 1, state: result.state }, STATE_KEY);
              written = true;
            }
          } catch {
            try { transaction.abort(); } catch { /* An earlier failure may already have aborted it. */ }
          }
        };
        transaction.onabort = () => resolve({ status: "save-error" });
        transaction.onerror = () => { /* Abort is the final failure signal. */ };
        transaction.oncomplete = () => {
          // A put request's success alone does not mean the transaction saved.
          if (written) {
            retireLegacySnapshots();
            if (apply) publish();
          }
          resolve(result);
        };
      });
    } catch { return { status: "save-error" }; }
  };
  return {
    load: async (): Promise<RecordLoadResult> => {
      const result = await transact();
      return result.status === "ok" ? result : { status: "save-error", state: loadLaunchState(legacyStorage(), clock()) };
    },
    commit: (previous: LaunchState, next: LaunchState) => transact((current, now) => mergeRecordChanges(current, previous, next, now)),
    replace: (previous: LaunchState, next: LaunchState) => transact((current, now) => replaceRecordChanges(current, previous, next, now)),
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      getChannel();
      const onStorage = (event: StorageEvent) => { if (event.key === SIGNAL_KEY) listener(); };
      if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(listener);
        if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
        if (!listeners.size) { channel?.close(); channel = undefined; }
      };
    },
    close: async () => {
      if (connection) { try { (await connection).close(); } catch { /* Already failed. */ } }
      connection = undefined;
      channel?.close();
      channel = undefined;
    },
  };
};

const browserStore = createRecordStore();
export const loadRecordStore = browserStore.load;
export const commitRecordChanges = browserStore.commit;
export const replaceRecordStore = browserStore.replace;
export const subscribeRecordStore = browserStore.subscribe;
