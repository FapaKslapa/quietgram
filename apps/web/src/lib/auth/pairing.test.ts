import { igSessions, user } from "@nodistraction/db";
import { createTestDb } from "@nodistraction/db/testing";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { decrypt } from "@/lib/auth/crypto";
import { issuePairingToken, redeemPairingToken, savePairedSession } from "@/lib/auth/pairing";

const key = Buffer.alloc(32, 3).toString("base64");
const now = new Date("2026-10-04T10:00:00Z");
const minutes = (count: number) => new Date(now.getTime() + count * 60_000);

describe("pairing", () => {
  let db: ReturnType<typeof createTestDb>;

  beforeEach(async () => {
    db = createTestDb();
    await db.insert(user).values({ id: "u1", name: "U", email: "u@example.com" });
  });

  it("redeems a token once and returns its user", async () => {
    const token = await issuePairingToken(db, "u1", now);
    expect(await redeemPairingToken(db, token, minutes(1))).toBe("u1");
    expect(await redeemPairingToken(db, token, minutes(2))).toBeNull();
  });

  it("rejects an expired token", async () => {
    const token = await issuePairingToken(db, "u1", now);
    expect(await redeemPairingToken(db, token, minutes(11))).toBeNull();
  });

  it("rejects an unknown token", async () => {
    expect(await redeemPairingToken(db, "nope", now)).toBeNull();
  });

  it("does not store the token in clear", async () => {
    const token = await issuePairingToken(db, "u1", now);
    const rows = await db.query.pairingTokens.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.tokenHash).not.toBe(token);
  });

  it("stores encrypted cookies as an active session", async () => {
    const cookies = { sessionId: "very-secret-session", csrfToken: "csrf", userId: "123" };
    await savePairedSession(db, key, "u1", cookies, now);
    const row = await db.query.igSessions.findFirst({ where: eq(igSessions.ownerId, "u1") });
    expect(row).toMatchObject({ status: "active", igUserId: "123" });
    expect(row?.cipher).not.toContain("very-secret-session");
    expect(JSON.parse(await decrypt(row?.cipher ?? "", row?.iv ?? "", key))).toEqual(cookies);
  });

  it("replaces the previous session on re-pair", async () => {
    await savePairedSession(db, key, "u1", { sessionId: "a", csrfToken: "c", userId: "1" }, now);
    await savePairedSession(db, key, "u1", { sessionId: "b", csrfToken: "c", userId: "1" }, now);
    expect(await db.query.igSessions.findMany()).toHaveLength(1);
  });
});
