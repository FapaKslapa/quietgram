import { igCredentials, igSessions, syncState } from "@nodistraction/db";
import { describe, expect, it } from "vitest";
import { MANUAL_LOGIN_GUARD_MS } from "@/lib/credentials/manual-login";
import { LOGIN_CHALLENGE_MESSAGE, MANUAL_LOGIN_MESSAGES } from "@/server/trpc/errors";
import { loginCalls, loginWorld, PASSWORD, TOTP_SECRET } from "@/test/credentials-world";
import { createCaller } from "@/test/engine-world";
import { createTestEnv } from "@/test/helpers";

const setup = async (options: Parameters<typeof loginWorld>[0] = {}) => {
  const world = loginWorld(options);
  const env = await createTestEnv(undefined, { engine: world.respond });
  await env.db.update(igSessions).set({ status: "expired" });
  return { env, world, caller: createCaller(env.context) };
};

const input = { username: "@me", password: PASSWORD, remember: true };

describe("credentials.login", () => {
  it("logs in, stores a credentials session and saves the encrypted credentials", async () => {
    const { env, caller } = await setup();
    expect(await caller.credentials.login(input)).toEqual({ sessionStatus: "active", saved: true });
    const [session] = await env.db.select().from(igSessions);
    expect(session).toMatchObject({ status: "active", source: "credentials" });
    const [stored] = await env.db.select().from(igCredentials);
    expect(stored).toMatchObject({ username: "me", status: "ready" });
    expect(JSON.stringify(stored)).not.toContain(PASSWORD);
    expect((await caller.refresh.overview()).profile).toBe("fast");
  });

  it("works once without persisting the password", async () => {
    const { env, caller } = await setup();
    const result = await caller.credentials.login({
      ...input,
      remember: false,
      totpSecret: TOTP_SECRET,
    });
    expect(result).toEqual({ sessionStatus: "active", saved: false });
    expect(await env.db.select().from(igCredentials)).toEqual([]);
    const [session] = await env.db.select().from(igSessions);
    expect(JSON.stringify(session)).not.toContain(PASSWORD);
    expect(JSON.parse(loginCalls(env.engineCalls)[0]?.body ?? "{}")).toMatchObject({
      totp_secret: TOTP_SECRET,
    });
  });

  it("guards against a double submit for twenty seconds only", async () => {
    const { env, caller } = await setup();
    await caller.credentials.login(input);
    await expect(caller.credentials.login(input)).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
    });
    expect(loginCalls(env.engineCalls)).toHaveLength(1);
    env.clock.current = new Date(env.clock.current.getTime() + MANUAL_LOGIN_GUARD_MS + 1);
    await caller.credentials.login(input);
    expect(loginCalls(env.engineCalls)).toHaveLength(2);
  });

  it("is not limited by the automatic daily caps", async () => {
    const { env, caller } = await setup();
    await caller.credentials.save({ username: "me", password: PASSWORD });
    await env.db
      .update(igCredentials)
      .set({ windowAttempts: 99, lastAttemptAt: env.clock.current });
    await caller.credentials.login(input);
    expect(loginCalls(env.engineCalls)).toHaveLength(1);
  });

  it.each([
    ["challenge", LOGIN_CHALLENGE_MESSAGE],
    ["bad", MANUAL_LOGIN_MESSAGES.bad_password],
    ["other-account", MANUAL_LOGIN_MESSAGES.wrong_account],
  ] as const)("reports %s without saving anything", async (mode, message) => {
    const { env, caller } = await setup({ mode });
    await expect(caller.credentials.login(input)).rejects.toMatchObject({
      message,
      code: "PRECONDITION_FAILED",
    });
    expect(await env.db.select().from(igCredentials)).toEqual([]);
    const [session] = await env.db.select().from(igSessions);
    expect(session).toMatchObject({ status: "expired", source: "extension" });
  });

  it("records the fast backoff when Instagram throttles the login", async () => {
    const { env, caller } = await setup({ mode: "throttled" });
    await expect(caller.credentials.login(input)).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
    });
    const [state] = await env.db.select().from(syncState);
    expect(state?.fastBackoffUntil).toBeInstanceOf(Date);
  });

  it("rejects an unauthenticated or malformed request", async () => {
    const { caller } = await setup();
    await expect(caller.credentials.login({ ...input, username: "bad name!" })).rejects.toThrow();
  });
});
