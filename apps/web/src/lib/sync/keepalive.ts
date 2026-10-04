import { igSessions, syncRuns } from "@nodistraction/db";
import { checkSession, SessionExpiredError } from "@nodistraction/ig";
import { eq } from "drizzle-orm";
import type { SyncDeps } from "@/lib/sync/deps";
import { buildRequester, markSessionExpired } from "@/lib/sync/session";

const checkOwner = async (
  deps: SyncDeps,
  session: { ownerId: string; cipher: string; iv: string },
): Promise<boolean> => {
  try {
    await checkSession(await buildRequester(deps, session));
    return true;
  } catch (error) {
    if (error instanceof SessionExpiredError) await markSessionExpired(deps, session.ownerId);
    return false;
  }
};

export const runKeepAlive = async (deps: SyncDeps): Promise<void> => {
  const sessions = await deps.db.select().from(igSessions).where(eq(igSessions.status, "active"));
  for (const [index, session] of sessions.entries()) {
    if (index > 0) await deps.delay();
    const startedAt = deps.now();
    const healthy = await checkOwner(deps, session);
    await deps.db.insert(syncRuns).values({
      id: crypto.randomUUID(),
      ownerId: session.ownerId,
      kind: "keepalive",
      startedAt,
      finishedAt: deps.now(),
      status: healthy ? "done" : "failed",
      total: 1,
      completed: healthy ? 1 : 0,
    });
  }
};
