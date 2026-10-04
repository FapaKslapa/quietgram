import { igSessions, user } from "@nodistraction/db";
import { createTestDb } from "@nodistraction/db/testing";
import { beforeEach, describe, expect, it } from "vitest";
import { handlePair } from "@/lib/auth/pair-handler";
import { issuePairingToken } from "@/lib/auth/pairing";

const cookieKey = Buffer.alloc(32, 5).toString("base64");
const now = new Date("2026-10-04T10:00:00Z");
const extensionOrigin = "chrome-extension://abcdefghijklmnop";

const body = { sessionId: "sess", csrfToken: "csrf", userId: "42" };

const post = (payload: unknown, origin: string | null = extensionOrigin) =>
  new Request("http://localhost/api/pair", {
    method: "POST",
    headers: { "content-type": "application/json", ...(origin ? { origin } : {}) },
    body: JSON.stringify(payload),
  });

describe("handlePair", () => {
  let db: ReturnType<typeof createTestDb>;
  let deps: Parameters<typeof handlePair>[1];

  beforeEach(async () => {
    db = createTestDb();
    await db.insert(user).values({ id: "u1", name: "U", email: "u@example.com" });
    deps = { db, cookieKey, now };
  });

  it("answers the preflight for extension origins only", async () => {
    const preflight = (origin: string) =>
      handlePair(
        new Request("http://localhost/api/pair", { method: "OPTIONS", headers: { origin } }),
        deps,
      );
    const allowed = await preflight(extensionOrigin);
    expect(allowed.status).toBe(204);
    expect(allowed.headers.get("access-control-allow-origin")).toBe(extensionOrigin);
    expect((await preflight("moz-extension://x")).status).toBe(204);
    expect((await preflight("https://evil.example")).status).toBe(403);
  });

  it("rejects a foreign origin", async () => {
    const token = await issuePairingToken(db, "u1", now);
    const response = await handlePair(post({ token, ...body }, "https://evil.example"), deps);
    expect(response.status).toBe(403);
  });

  it("rejects an invalid payload", async () => {
    expect((await handlePair(post({ token: "t" }), deps)).status).toBe(400);
    const notJson = new Request("http://localhost/api/pair", { method: "POST", body: "x" });
    expect((await handlePair(notJson, deps)).status).toBe(400);
  });

  it("rejects an unknown token", async () => {
    expect((await handlePair(post({ token: "nope", ...body }), deps)).status).toBe(401);
    expect(await db.select().from(igSessions)).toEqual([]);
  });

  it("stores the session and burns the token", async () => {
    const token = await issuePairingToken(db, "u1", now);
    const response = await handlePair(post({ token, ...body }), deps);
    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe(extensionOrigin);
    const [row] = await db.select().from(igSessions);
    expect(row).toMatchObject({ ownerId: "u1", igUserId: "42", status: "active" });
    expect((await handlePair(post({ token, ...body }), deps)).status).toBe(401);
  });
});
