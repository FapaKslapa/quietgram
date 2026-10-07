import { igSessions } from "@nodistraction/db";
import { IgThrottledError } from "@nodistraction/ig";
import { eq } from "drizzle-orm";
import type { SyncDeps } from "@/lib/sync/deps";
import { NoSessionError } from "@/lib/sync/errors";
import { buildSource, recordThrottle, withRecovery } from "@/lib/sync/session";

const verify = async (deps: SyncDeps, ownerId: string): Promise<void> => {
  const [session] = await deps.db.select().from(igSessions).where(eq(igSessions.ownerId, ownerId));
  if (!session) throw new NoSessionError();
  const source = buildSource(deps, session);
  await source.refreshSession();
  await source.checkSession();
};

export const recheckSession = async (
  deps: SyncDeps,
  ownerId: string,
): Promise<{ sessionStatus: "active" }> => {
  try {
    await withRecovery(deps, ownerId, () => verify(deps, ownerId));
  } catch (error) {
    if (error instanceof IgThrottledError) await recordThrottle(deps, ownerId);
    throw error;
  }
  await deps.db
    .update(igSessions)
    .set({ status: "active", updatedAt: deps.now() })
    .where(eq(igSessions.ownerId, ownerId));
  return { sessionStatus: "active" };
};
