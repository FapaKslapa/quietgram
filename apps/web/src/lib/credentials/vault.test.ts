import { igCredentials } from "@nodistraction/db";
import { createTestDb } from "@nodistraction/db/testing";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
  loadCredentialStatus,
  loadCredentials,
  removeCredentials,
  saveCredentials,
  setCredentialState,
} from "@/lib/credentials/vault";
import { COOKIE_KEY, OWNER, seedOwner } from "@/test/helpers";

const NOW = new Date("2026-10-04T12:00:00Z");
const OTHER_KEY = btoa("z".repeat(32));
const SECRET_PASSWORD = "p4ssw0rd-that-must-stay-hidden";

const setup = async () => {
  const db = createTestDb();
  await seedOwner(db);
  await seedOwner(db, "other");
  return db;
};

describe("credential vault", () => {
  it("round-trips the encrypted payload", async () => {
    const db = await setup();
    const input = { username: "me", password: SECRET_PASSWORD, totpSecret: "GEZDGNBVGY3TQOJQ" };
    await saveCredentials(db, COOKIE_KEY, OWNER, input, NOW);
    expect(await loadCredentials(db, COOKIE_KEY, OWNER)).toEqual({ input, state: "ready" });
  });

  it("keeps the password and the totp secret out of the database", async () => {
    const db = await setup();
    await saveCredentials(
      db,
      COOKIE_KEY,
      OWNER,
      { username: "me", password: SECRET_PASSWORD, totpSecret: "GEZDGNBVGY3TQOJQ" },
      NOW,
    );
    const [row] = await db.select().from(igCredentials);
    expect(JSON.stringify(row)).not.toContain(SECRET_PASSWORD);
    expect(JSON.stringify(row)).not.toContain("GEZDGNBVGY3TQOJQ");
    expect(row?.username).toBe("me");
  });

  it("cannot be read with another key", async () => {
    const db = await setup();
    await saveCredentials(db, COOKIE_KEY, OWNER, { username: "me", password: "pw" }, NOW);
    expect(await loadCredentials(db, OTHER_KEY, OWNER)).toBeNull();
  });

  it("exposes only a configured flag, the username and the state", async () => {
    const db = await setup();
    expect(await loadCredentialStatus(db, OWNER)).toEqual({
      configured: false,
      username: null,
      state: null,
    });
    await saveCredentials(db, COOKIE_KEY, OWNER, { username: "me", password: "pw" }, NOW);
    expect(await loadCredentialStatus(db, OWNER)).toEqual({
      configured: true,
      username: "me",
      state: "ready",
    });
  });

  it("scopes every operation to the owner", async () => {
    const db = await setup();
    await saveCredentials(db, COOKIE_KEY, OWNER, { username: "me", password: "pw" }, NOW);
    await saveCredentials(db, COOKIE_KEY, "other", { username: "you", password: "pw2" }, NOW);
    await setCredentialState(db, OWNER, "challenge", NOW);
    expect((await loadCredentialStatus(db, "other")).state).toBe("ready");
    await removeCredentials(db, OWNER);
    expect((await loadCredentialStatus(db, OWNER)).configured).toBe(false);
    expect(await loadCredentials(db, COOKIE_KEY, "other")).toMatchObject({
      input: { username: "you", password: "pw2" },
    });
  });

  it("saving again resets the state but keeps the attempt counters", async () => {
    const db = await setup();
    await saveCredentials(db, COOKIE_KEY, OWNER, { username: "me", password: "pw" }, NOW);
    await db
      .update(igCredentials)
      .set({ status: "rejected", windowAttempts: 2, lastAttemptAt: NOW })
      .where(eq(igCredentials.ownerId, OWNER));
    await saveCredentials(db, COOKIE_KEY, OWNER, { username: "me", password: "new" }, NOW);
    const [row] = await db.select().from(igCredentials);
    expect(row).toMatchObject({ status: "ready", windowAttempts: 2 });
  });
});
