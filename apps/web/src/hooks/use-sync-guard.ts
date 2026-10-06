"use client";

import { useCallback } from "react";
import { canSyncView, SYNC_GUARD_MS } from "@/lib/messages";

const lastSyncByView = new Map<string, number>();

export function useSyncGuard(view: string) {
  const ready = useCallback(
    () => canSyncView(lastSyncByView.get(view) ?? null, Date.now()),
    [view],
  );
  const mark = useCallback(() => {
    lastSyncByView.set(view, Date.now());
  }, [view]);
  const until = useCallback((): number | null => {
    const last = lastSyncByView.get(view);
    return last === undefined ? null : last + SYNC_GUARD_MS;
  }, [view]);
  return { ready, mark, until };
}
