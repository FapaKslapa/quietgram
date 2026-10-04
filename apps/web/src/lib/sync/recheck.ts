import { igSessions } from "@nodistraction/db";
import { checkSession, IgThrottledError } from "@nodistraction/ig";
import { eq } from "drizzle-orm";
import type { SyncDeps } from "@/lib/sync/deps";
import { NoSessionError } from "@/lib/sync/errors";
import { buildRequester, recordThrottle } from "@/lib/sync/session";

export const recheckSession = async (
  deps: SyncDeps,
  ownerId: string,
): Promise<{ sessionStatus: "active" }> => {
  const [session] = await deps.db.select().from(igSessions).where(eq(igSessions.ownerId, ownerId));
  if (!session) throw new NoSessionError();
  try {
    await checkSession(await buildRequester(deps, session));
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
