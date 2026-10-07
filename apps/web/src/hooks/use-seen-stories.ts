"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { markSeenLocal, parseSeenMap, SEEN_STORAGE_KEY, type TrayEntry } from "@/lib/stories";

type SeenEntry = Pick<TrayEntry, "userId" | "latestReelMedia">;

const listeners = new Set<() => void>();
let snapshot: string | null | undefined;

const readStored = (): string | null => {
  try {
    return window.localStorage.getItem(SEEN_STORAGE_KEY);
  } catch {
    return null;
  }
};

const getSnapshot = (): string | null => {
  if (snapshot === undefined) snapshot = readStored();
  return snapshot;
};

const getServerSnapshot = (): string | null => null;

const publish = (next: string | null) => {
  snapshot = next;
  for (const listener of listeners) listener();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === SEEN_STORAGE_KEY) publish(readStored());
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
};

const persist = (value: string) => {
  try {
    window.localStorage.setItem(SEEN_STORAGE_KEY, value);
  } catch {
    return;
  }
};

export function useSeenStories() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const seen = useMemo(() => parseSeenMap(raw), [raw]);

  const markSeen = useCallback((entry: SeenEntry) => {
    const current = parseSeenMap(getSnapshot());
    const next = markSeenLocal(current, entry);
    if (next === current) return;
    const serialized = JSON.stringify(next);
    persist(serialized);
    publish(serialized);
  }, []);

  return { seen, markSeen };
}
