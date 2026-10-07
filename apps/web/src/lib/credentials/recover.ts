import { igSessions } from "@nodistraction/db";
import { EngineBadCredentialsError, EngineLoginChallengeError } from "@nodistraction/ig";
import { eq } from "drizzle-orm";
import { savePairedSession } from "@/lib/auth/pairing";
import { claimLoginAttempt } from "@/lib/credentials/attempts";
import { loadCredentials, setCredentialState } from "@/lib/credentials/vault";
import type { SyncDeps } from "@/lib/sync/deps";
import { LoginAttentionError } from "@/lib/sync/errors";

const flag = async (
  deps: SyncDeps,
  ownerId: string,
  kind: LoginAttentionError["kind"],
): Promise<never> => {
  await setCredentialState(
    deps.db,
    ownerId,
    kind === "challenge" ? "challenge" : "rejected",
    deps.now(),
  );
  throw new LoginAttentionError(kind);
};

export const recoverSession = async (deps: SyncDeps, ownerId: string): Promise<boolean> => {
  const login = deps.source.login;
  if (login === null) return false;
  const stored = await loadCredentials(deps.db, deps.getCookieKey(), ownerId);
  if (stored?.state !== "ready") return false;
  const [session] = await deps.db.select().from(igSessions).where(eq(igSessions.ownerId, ownerId));
  if (!session) return false;
  if (!(await claimLoginAttempt(deps.db, ownerId, deps.now()))) return false;
  try {
    const cookies = await login(session.igUserId, stored.input);
    if (cookies.userId !== session.igUserId) return await flag(deps, ownerId, "credentials");
    await savePairedSession(
      deps.db,
      deps.getCookieKey(),
      ownerId,
      cookies,
      deps.now(),
      "credentials",
    );
    return true;
  } catch (error) {
    if (error instanceof EngineLoginChallengeError) return flag(deps, ownerId, "challenge");
    if (error instanceof EngineBadCredentialsError) return flag(deps, ownerId, "credentials");
    throw error;
  }
};
