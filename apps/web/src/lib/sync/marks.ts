import { dmSyncMarks } from "@nodistraction/db";
import { and, eq } from "drizzle-orm";
import { isWithinWindow } from "@/lib/sync/cooldown";
import type { SyncDeps } from "@/lib/sync/deps";

export const isFresh = async (
  deps: SyncDeps,
  ownerId: string,
  scope: string,
  windowMs: number,
): Promise<boolean> => {
  const [mark] = await deps.db
    .select({ syncedAt: dmSyncMarks.syncedAt })
    .from(dmSyncMarks)
    .where(and(eq(dmSyncMarks.ownerId, ownerId), eq(dmSyncMarks.scope, scope)));
  return isWithinWindow(mark?.syncedAt ?? null, deps.now(), windowMs);
};

export const markSynced = async (deps: SyncDeps, ownerId: string, scope: string): Promise<void> => {
  const syncedAt = deps.now();
  await deps.db
    .insert(dmSyncMarks)
    .values({ ownerId, scope, syncedAt })
    .onConflictDoUpdate({ target: [dmSyncMarks.ownerId, dmSyncMarks.scope], set: { syncedAt } });
};
