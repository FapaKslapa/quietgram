import { igCredentials } from "@nodistraction/db";
import { createTestDb } from "@nodistraction/db/testing";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
  ATTEMPT_SPACING_MS,
  ATTEMPT_WINDOW_MS,
  claimLoginAttempt,
  MAX_ATTEMPTS_PER_WINDOW,
} from "@/lib/credentials/attempts";
import { saveCredentials } from "@/lib/credentials/vault";
import { COOKIE_KEY, OWNER, seedOwner } from "@/test/helpers";

const START = new Date("2026-10-04T12:00:00Z");
const at = (offsetMs: number) => new Date(START.getTime() + offsetMs);

const setup = async () => {
  const db = createTestDb();
  await seedOwner(db);
  await seedOwner(db, "other");
  for (const owner of [OWNER, "other"]) {
    await saveCredentials(db, COOKIE_KEY, owner, { username: "me", password: "pw" }, START);
  }
  return db;
};

describe("login attempt caps", () => {
  it("allows the first attempt and blocks another within thirty minutes", async () => {
    const db = await setup();
    expect(await claimLoginAttempt(db, OWNER, START)).toBe(true);
    expect(await claimLoginAttempt(db, OWNER, at(ATTEMPT_SPACING_MS - 1))).toBe(false);
    expect(await claimLoginAttempt(db, OWNER, at(ATTEMPT_SPACING_MS))).toBe(true);
  });

  it("allows three attempts per day and then blocks until the window ends", async () => {
    const db = await setup();
    const results: boolean[] = [];
    for (let index = 0; index < MAX_ATTEMPTS_PER_WINDOW + 2; index += 1) {
      results.push(await claimLoginAttempt(db, OWNER, at(index * ATTEMPT_SPACING_MS)));
    }
    expect(results).toEqual([true, true, true, false, false]);
    expect(await claimLoginAttempt(db, OWNER, at(ATTEMPT_WINDOW_MS - 1))).toBe(false);
    expect(await claimLoginAttempt(db, OWNER, at(ATTEMPT_WINDOW_MS))).toBe(true);
    const [row] = await db.select().from(igCredentials).where(eq(igCredentials.ownerId, OWNER));
    expect(row?.windowAttempts).toBe(1);
  });

  it("does not count blocked attempts", async () => {
    const db = await setup();
    await claimLoginAttempt(db, OWNER, START);
    await claimLoginAttempt(db, OWNER, at(1000));
    await claimLoginAttempt(db, OWNER, at(2000));
    const [row] = await db.select().from(igCredentials).where(eq(igCredentials.ownerId, OWNER));
    expect(row?.windowAttempts).toBe(1);
  });

  it("keeps owners independent and survives re-saving the credentials", async () => {
    const db = await setup();
    expect(await claimLoginAttempt(db, OWNER, START)).toBe(true);
    expect(await claimLoginAttempt(db, "other", START)).toBe(true);
    await saveCredentials(db, COOKIE_KEY, OWNER, { username: "me", password: "new" }, at(1000));
    expect(await claimLoginAttempt(db, OWNER, at(2000))).toBe(false);
  });

  it("refuses when there are no credentials", async () => {
    const db = createTestDb();
    expect(await claimLoginAttempt(db, OWNER, START)).toBe(false);
  });
});
