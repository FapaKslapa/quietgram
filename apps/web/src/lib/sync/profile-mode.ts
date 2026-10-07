import { igSessions, syncState } from "@nodistraction/db";
import { eq } from "drizzle-orm";
import type { SyncDeps } from "@/lib/sync/deps";
import { FAST_BACKOFF_MS, limitsFor, resolveProfile, type SyncLimits } from "@/lib/sync/limits";

export type ProfileState = { limits: SyncLimits; backoffUntil: Date | null };

export const loadBackoff = async (deps: SyncDeps, ownerId: string): Promise<Date | null> => {
  const [state] = await deps.db
    .select({ until: syncState.fastBackoffUntil })
    .from(syncState)
    .where(eq(syncState.ownerId, ownerId));
  return state?.until ?? null;
};

export const loadProfileState = async (deps: SyncDeps, ownerId: string): Promise<ProfileState> => {
  const [[session], backoffUntil] = await Promise.all([
    deps.db
      .select({ source: igSessions.source })
      .from(igSessions)
      .where(eq(igSessions.ownerId, ownerId)),
    loadBackoff(deps, ownerId),
  ]);
  const profile = resolveProfile(session?.source ?? null, backoffUntil, deps.now());
  return { limits: limitsFor(profile), backoffUntil };
};

export const loadLimits = async (deps: SyncDeps, ownerId: string): Promise<SyncLimits> =>
  (await loadProfileState(deps, ownerId)).limits;

export const recordBackoff = async (deps: SyncDeps, ownerId: string): Promise<void> => {
  const fastBackoffUntil = new Date(deps.now().getTime() + FAST_BACKOFF_MS);
  await deps.db
    .insert(syncState)
    .values({ ownerId, fastBackoffUntil })
    .onConflictDoUpdate({ target: syncState.ownerId, set: { fastBackoffUntil } });
};
