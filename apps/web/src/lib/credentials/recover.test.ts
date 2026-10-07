import { igSessions, syncState } from "@nodistraction/db";
import { IgThrottledError, SessionExpiredError } from "@nodistraction/ig";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { decrypt } from "@/lib/auth/crypto";
import { loadCredentialStatus, saveCredentials } from "@/lib/credentials/vault";
import { LoginAttentionError } from "@/lib/sync/errors";
import { recheckSession } from "@/lib/sync/recheck";
import { withIgSession } from "@/lib/sync/session";
import { loginCalls, loginWorld, PASSWORD, TOTP_SECRET } from "@/test/credentials-world";
import { COOKIE_KEY, createTestEnv, OWNER, seedOwner } from "@/test/helpers";

const setup = async (options: Parameters<typeof loginWorld>[0] = {}, withCredentials = true) => {
  const world = loginWorld(options);
  const env = await createTestEnv(undefined, { engine: world.respond });
  if (withCredentials) {
    await saveCredentials(
      env.db,
      COOKIE_KEY,
      OWNER,
      { username: "me", password: PASSWORD, totpSecret: TOTP_SECRET },
      env.clock.current,
    );
  }
  const read = () => withIgSession(env.deps, OWNER, ({ source }) => source.storiesTray());
  const advance = (ms: number) => {
    env.clock.current = new Date(env.clock.current.getTime() + ms);
  };
  return { env, world, read, advance };
};

const MINUTE = 60_000;

describe("automatic re-login", () => {
  it("logs in once, stores the fresh session and retries the read", async () => {
    const { env, read } = await setup();
    expect(await read()).toEqual([]);
    const [login] = loginCalls(env.engineCalls);
    expect(JSON.parse(login?.body ?? "")).toEqual({
      username: "me",
      password: PASSWORD,
      totp_secret: TOTP_SECRET,
    });
    expect(login?.accountId).toBe("1000");
    const [session] = await env.db.select().from(igSessions);
    expect(session?.status).toBe("active");
    expect(JSON.parse(await decrypt(session?.cipher ?? "", session?.iv ?? "", COOKIE_KEY))).toEqual(
      {
        sessionId: "fresh-session",
        csrfToken: "fresh-csrf",
        userId: "1000",
      },
    );
    expect(env.engineCalls.filter((call) => call.path === "/v1/stories/tray")).toHaveLength(1);
  });

  it("retries the failed operation only once", async () => {
    const { env, read } = await setup({ staysExpired: true });
    await expect(read()).rejects.toThrow(SessionExpiredError);
    expect(loginCalls(env.engineCalls)).toHaveLength(1);
    const [session] = await env.db.select().from(igSessions);
    expect(session?.status).toBe("expired");
  });

  it("does nothing without stored credentials", async () => {
    const { env, read } = await setup({}, false);
    await expect(read()).rejects.toThrow(SessionExpiredError);
    expect(loginCalls(env.engineCalls)).toHaveLength(0);
  });

  it("does nothing without an engine", async () => {
    const env = await createTestEnv(() => {
      throw new SessionExpiredError();
    });
    await saveCredentials(
      env.db,
      COOKIE_KEY,
      OWNER,
      { username: "me", password: PASSWORD },
      env.clock.current,
    );
    await expect(
      withIgSession(env.deps, OWNER, ({ source }) => source.storiesTray()),
    ).rejects.toThrow();
    expect(env.engineCalls).toHaveLength(0);
  });

  it("recovers the manual recheck too", async () => {
    const { env } = await setup();
    expect(await recheckSession(env.deps, OWNER)).toEqual({ sessionStatus: "active" });
    expect(loginCalls(env.engineCalls)).toHaveLength(1);
  });

  it("never tries to solve a challenge and stops until the user resumes", async () => {
    const { env, read, advance, world } = await setup({ mode: "challenge" });
    const failure = await read().catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(LoginAttentionError);
    expect(failure).toMatchObject({ kind: "challenge" });
    expect(await loadCredentialStatus(env.db, OWNER)).toMatchObject({ state: "challenge" });
    world.state.mode = "ok";
    advance(40 * MINUTE);
    await expect(read()).rejects.toThrow(SessionExpiredError);
    expect(loginCalls(env.engineCalls)).toHaveLength(1);
  });

  it("flags rejected credentials", async () => {
    const { env, read } = await setup({ mode: "bad" });
    await expect(read()).rejects.toMatchObject({ kind: "credentials" });
    expect(await loadCredentialStatus(env.db, OWNER)).toMatchObject({ state: "rejected" });
  });

  it("flags a login that lands on another account and keeps the old session", async () => {
    const { env, read } = await setup({ mode: "other-account" });
    await expect(read()).rejects.toMatchObject({ kind: "credentials" });
    const [session] = await env.db.select().from(igSessions);
    expect(session?.status).toBe("expired");
    expect(
      JSON.parse(await decrypt(session?.cipher ?? "", session?.iv ?? "", COOKIE_KEY)),
    ).toMatchObject({
      sessionId: "s",
    });
  });

  it("records a throttle from the engine", async () => {
    const { env, read } = await setup({ mode: "throttled" });
    await expect(read()).rejects.toThrow(IgThrottledError);
    const [state] = await env.db.select().from(syncState).where(eq(syncState.ownerId, OWNER));
    expect(state?.lastRefreshAt).not.toBeNull();
  });

  it("counts failed attempts and enforces the spacing and the daily cap", async () => {
    const { env, read, advance } = await setup({ mode: "down" });
    await expect(read()).rejects.toThrow();
    await expect(read()).rejects.toThrow(SessionExpiredError);
    expect(loginCalls(env.engineCalls)).toHaveLength(1);
    for (const expected of [2, 3, 3]) {
      advance(31 * MINUTE);
      await expect(read()).rejects.toThrow();
      expect(loginCalls(env.engineCalls)).toHaveLength(expected);
    }
    advance(24 * 60 * MINUTE);
    await expect(read()).rejects.toThrow();
    expect(loginCalls(env.engineCalls)).toHaveLength(4);
  });

  it("only touches the credentials of the signed-in owner", async () => {
    const { env, read } = await setup({}, false);
    await seedOwner(env.db, "intruder");
    await saveCredentials(
      env.db,
      COOKIE_KEY,
      "intruder",
      { username: "other", password: "other-secret" },
      env.clock.current,
    );
    await expect(read()).rejects.toThrow(SessionExpiredError);
    expect(loginCalls(env.engineCalls)).toHaveLength(0);
  });
});
