import { igSessions } from "@nodistraction/db";
import {
  EngineBadCredentialsError,
  EngineLoginChallengeError,
  IgThrottledError,
} from "@nodistraction/ig";
import { eq } from "drizzle-orm";
import { savePairedSession } from "@/lib/auth/pairing";
import { type CredentialInput, saveCredentials } from "@/lib/credentials/vault";
import type { SyncDeps } from "@/lib/sync/deps";
import {
  CooldownError,
  LoginAttentionError,
  ManualLoginError,
  NoSessionError,
} from "@/lib/sync/errors";
import { claimSync } from "@/lib/sync/marks";
import { recordThrottle } from "@/lib/sync/session";

export const MANUAL_LOGIN_GUARD_MS = 20_000;
const MANUAL_LOGIN_SCOPE = "login:manual";

export const manualLogin = async (
  deps: SyncDeps,
  ownerId: string,
  input: CredentialInput,
  remember: boolean,
): Promise<void> => {
  const login = deps.source.login;
  if (login === null) throw new ManualLoginError("unavailable");
  const [session] = await deps.db.select().from(igSessions).where(eq(igSessions.ownerId, ownerId));
  if (!session) throw new NoSessionError();
  const release = await claimSync(deps, ownerId, MANUAL_LOGIN_SCOPE, MANUAL_LOGIN_GUARD_MS);
  if (release === null) throw new CooldownError(MANUAL_LOGIN_GUARD_MS / 1000);
  try {
    const cookies = await login(session.igUserId, input);
    if (cookies.userId !== session.igUserId) throw new ManualLoginError("wrong_account");
    await savePairedSession(
      deps.db,
      deps.getCookieKey(),
      ownerId,
      cookies,
      deps.now(),
      "credentials",
    );
  } catch (error) {
    if (error instanceof EngineLoginChallengeError) throw new LoginAttentionError("challenge");
    if (error instanceof EngineBadCredentialsError) throw new ManualLoginError("bad_password");
    if (error instanceof IgThrottledError) await recordThrottle(deps, ownerId);
    throw error;
  }
  if (remember) await saveCredentials(deps.db, deps.getCookieKey(), ownerId, input, deps.now());
};
