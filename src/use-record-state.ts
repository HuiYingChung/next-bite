import { useCallback, useEffect, useRef, useState } from "react";
import { loadLaunchState } from "./launch-state";
import type { LaunchState } from "./launch-state";
import { commitRecordChanges, loadRecordStore, replaceRecordStore, subscribeRecordStore } from "./record-store";

// Writes are explicit user actions. Rendering, focus and remote notifications
// only read: none can write an older snapshot back over another tab's changes.
export function useRecordState() {
  const [state, setState] = useState<LaunchState>(loadLaunchState);
  const stateRef = useRef(state);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const lock = useRef(false);
  const refreshAfterWrite = useRef(false);
  const generation = useRef(0);
  const mounted = useRef(false);
  const accept = useCallback((next: LaunchState) => {
    stateRef.current = next;
    setState(next);
  }, []);
  const refresh = useCallback(async () => {
    if (lock.current) {
      // A different tab can commit immediately after ours, while our promise
      // is still settling. Do not lose its notification during the write lock.
      refreshAfterWrite.current = true;
      return;
    }
    const request = ++generation.current;
    const result = await loadRecordStore();
    if (!mounted.current || request !== generation.current) return;
    if (result.status === "ok") accept(result.state);
    setFailed(result.status !== "ok");
    setReady(true);
  }, [accept]);
  useEffect(() => {
    mounted.current = true;
    void refresh();
    const unsubscribe = subscribeRecordStore(() => { void refresh(); });
    return () => {
      mounted.current = false;
      generation.current += 1;
      unsubscribe();
    };
  }, [refresh]);
  const update = async (
    transform: (current: LaunchState) => LaunchState,
    base = stateRef.current,
    replace = false,
  ) => {
    if (!mounted.current || !ready || lock.current) return { status: "busy" as const };
    lock.current = true;
    generation.current += 1;
    setBusy(true);
    try {
      const next = transform(base);
      const result = await (replace ? replaceRecordStore(base, next) : commitRecordChanges(base, next));
      if (mounted.current) {
        if ("state" in result) accept(result.state);
        setFailed(result.status === "save-error");
      }
      return result;
    } catch {
      if (mounted.current) setFailed(true);
      return { status: "save-error" as const };
    } finally {
      lock.current = false;
      if (mounted.current) {
        setBusy(false);
        if (refreshAfterWrite.current) {
          refreshAfterWrite.current = false;
          void refresh();
        }
      }
    }
  };
  return { state, stateRef, ready, busy, failed, refresh, update };
}
