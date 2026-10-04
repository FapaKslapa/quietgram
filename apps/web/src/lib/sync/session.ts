import { igSessions, syncState } from "@nodistraction/db";
import {
  type IgCookies,
  IgThrottledError,
  type Requester,
  SessionExpiredError,
} from "@nodistraction/ig";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { decrypt } from "@/lib/auth/crypto";
import { throttleMarker } from "@/lib/sync/cooldown";
import type { SyncDeps } from "@/lib/sync/deps";
import { NoSessionError } from "@/lib/sync/errors";

const cookiesSchema = z.compile(
  z.object({ sessionId: z.string(), csrfToken: z.string(), userId: z.string() }),
);

export type IgSessionContext = { requester: Requester; igUserId: string };

export const markSessionExpired = async (deps: SyncDeps, ownerId: string): Promise<void> => {
  await deps.db
    .update(igSessions)
    .set({ status: "expired", updatedAt: deps.now() })
    .where(eq(igSessions.ownerId, ownerId));
};

export const recordThrottle = async (deps: SyncDeps, ownerId: string): Promise<void> => {
  const lastRefreshAt = throttleMarker(deps.now());
  await deps.db
    .insert(syncState)
    .values({ ownerId, lastRefreshAt })
    .onConflictDoUpdate({ target: syncState.ownerId, set: { lastRefreshAt } });
};

export const buildRequester = async (
  deps: SyncDeps,
  session: { cipher: string; iv: string },
): Promise<Requester> => {
  const cookies: IgCookies = cookiesSchema.parse(
    JSON.parse(await decrypt(session.cipher, session.iv, deps.getCookieKey())),
  );
  return deps.createRequester(cookies);
};

export const withIgSession = async <T>(
  deps: SyncDeps,
  ownerId: string,
  task: (context: IgSessionContext) => Promise<T>,
): Promise<T> => {
  const [session] = await deps.db.select().from(igSessions).where(eq(igSessions.ownerId, ownerId));
  if (!session) throw new NoSessionError();
  if (session.status === "expired") throw new SessionExpiredError();
  const requester = await buildRequester(deps, session);
  try {
    return await task({ requester, igUserId: session.igUserId });
  } catch (error) {
    if (error instanceof SessionExpiredError) await markSessionExpired(deps, ownerId);
    if (error instanceof IgThrottledError) await recordThrottle(deps, ownerId);
    throw error;
  }
};
