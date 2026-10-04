import { pairingTokens, user } from "@nodistraction/db";
import { createTestDb } from "@nodistraction/db/testing";
import { describe, expect, it } from "vitest";
import { createCallerFactory } from "@/server/trpc/init";
import { appRouter } from "@/server/trpc/routers/_app";

const createCaller = createCallerFactory(appRouter);

describe("pairing.issueToken", () => {
  it("rejects anonymous callers", async () => {
    const db = createTestDb();
    const caller = createCaller({ db, getSession: async () => null });
    await expect(caller.pairing.issueToken()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(await db.select().from(pairingTokens)).toEqual([]);
  });

  it("issues a hashed one-time token for the logged in user", async () => {
    const db = createTestDb();
    await db.insert(user).values({ id: "u1", name: "U", email: "u@example.com" });
    const caller = createCaller({ db, getSession: async () => ({ user: { id: "u1" } }) });
    const { token } = await caller.pairing.issueToken();
    const [row] = await db.select().from(pairingTokens);
    expect(row?.userId).toBe("u1");
    expect(row?.tokenHash).not.toBe(token);
  });
});
