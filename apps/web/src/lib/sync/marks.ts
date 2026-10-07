import { dmSyncMarks } from "@nodistraction/db";
import { and, eq, lte } from "drizzle-orm";
import { isWithinWindow } from "@/lib/sync/cooldown";
import type { SyncDeps } from "@/lib/sync/deps";

const readMark = async (deps: SyncDeps, ownerId: string, scope: string): Promise<Date | null> => {
  const [mark] = await deps.db
    .select({ syncedAt: dmSyncMarks.syncedAt })
    .from(dmSyncMarks)
    .where(and(eq(dmSyncMarks.ownerId, ownerId), eq(dmSyncMarks.scope, scope)));
  return mark?.syncedAt ?? null;
};

export const isFresh = async (
  deps: SyncDeps,
  ownerId: string,
  scope: string,
  windowMs: number,
): Promise<boolean> => isWithinWindow(await readMark(deps, ownerId, scope), deps.now(), windowMs);

export const markSynced = async (deps: SyncDeps, ownerId: string, scope: string): Promise<void> => {
  const syncedAt = deps.now();
  await deps.db
    .insert(dmSyncMarks)
    .values({ ownerId, scope, syncedAt })
    .onConflictDoUpdate({ target: [dmSyncMarks.ownerId, dmSyncMarks.scope], set: { syncedAt } });
};

export const clearMark = async (deps: SyncDeps, ownerId: string, scope: string): Promise<void> => {
  await deps.db
    .delete(dmSyncMarks)
    .where(and(eq(dmSyncMarks.ownerId, ownerId), eq(dmSyncMarks.scope, scope)));
};

export const claimSync = async (
  deps: SyncDeps,
  ownerId: string,
  scope: string,
  windowMs: number,
): Promise<(() => Promise<void>) | null> => {
  const now = deps.now();
  const previous = await readMark(deps, ownerId, scope);
  const claimed = await deps.db
    .insert(dmSyncMarks)
    .values({ ownerId, scope, syncedAt: now })
    .onConflictDoUpdate({
      target: [dmSyncMarks.ownerId, dmSyncMarks.scope],
      set: { syncedAt: now },
      setWhere: lte(dmSyncMarks.syncedAt, new Date(now.getTime() - windowMs)),
    })
    .returning({ scope: dmSyncMarks.scope });
  if (claimed.length === 0) return null;
  return async () => {
    if (previous === null) {
      await clearMark(deps, ownerId, scope);
      return;
    }
    await deps.db
      .update(dmSyncMarks)
      .set({ syncedAt: previous })
      .where(and(eq(dmSyncMarks.ownerId, ownerId), eq(dmSyncMarks.scope, scope)));
  };
};
