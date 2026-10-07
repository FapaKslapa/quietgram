import { igCredentials } from "@nodistraction/db";
import { describe, expect, it } from "vitest";
import { createCaller } from "@/test/engine-world";
import { createTestEnv, seedOwner } from "@/test/helpers";

const PASSWORD = "very-secret-password";

const setup = async () => {
  const env = await createTestEnv();
  await seedOwner(env.db, "other");
  const other = createCaller({
    ...env.context,
    getSession: async () => ({ user: { id: "other" } }),
  });
  return { env, caller: createCaller(env.context), other };
};

describe("credentials router", () => {
  it("starts with automatic login off", async () => {
    const { caller } = await setup();
    expect(await caller.credentials.status()).toEqual({
      configured: false,
      username: null,
      state: null,
    });
  });

  it("saves and never returns the secrets", async () => {
    const { env, caller } = await setup();
    const saved = await caller.credentials.save({
      username: "@me.account",
      password: PASSWORD,
      totpSecret: "gezd gnbv gy3t qojq",
    });
    expect(saved).toEqual({ configured: true, username: "me.account", state: "ready" });
    expect(JSON.stringify(await caller.credentials.status())).not.toContain(PASSWORD);
    const [row] = await env.db.select().from(igCredentials);
    expect(JSON.stringify(row)).not.toContain(PASSWORD);
  });

  it("rejects malformed input", async () => {
    const { caller } = await setup();
    await expect(
      caller.credentials.save({ username: "not valid!", password: PASSWORD }),
    ).rejects.toThrow();
    await expect(caller.credentials.save({ username: "me", password: "" })).rejects.toThrow();
    await expect(
      caller.credentials.save({ username: "me", password: PASSWORD, totpSecret: "###" }),
    ).rejects.toThrow();
  });

  it("scopes status, resume and removal to the signed-in user", async () => {
    const { caller, other } = await setup();
    await caller.credentials.save({ username: "me", password: PASSWORD });
    expect((await other.credentials.status()).configured).toBe(false);
    await expect(other.credentials.resume()).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    await other.credentials.remove();
    expect((await caller.credentials.status()).configured).toBe(true);
  });

  it("removes the credentials", async () => {
    const { caller } = await setup();
    await caller.credentials.save({ username: "me", password: PASSWORD });
    expect(await caller.credentials.remove()).toEqual({
      configured: false,
      username: null,
      state: null,
    });
  });
});
