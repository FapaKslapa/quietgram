import { describe, expect, it } from "vitest";
import { checkSession, classifySession, SESSION_CHECK_URL } from "#ext/session-check";

const observe = (status: number, body: unknown, redirected = false, url = SESSION_CHECK_URL) => ({
  status,
  body,
  redirected,
  url,
});

const respond = (status: number, body: unknown, redirected = false, url = SESSION_CHECK_URL) =>
  Object.defineProperties(new Response(JSON.stringify(body), { status }), {
    redirected: { value: redirected },
    url: { value: url },
  });

describe("classifySession", () => {
  it("accepts a 200 with a user", () => {
    expect(classifySession(observe(200, { user: { username: "me" } }))).toBe("valid");
  });

  it("rejects a 200 without a user", () => {
    expect(classifySession(observe(200, {}))).toBe("unknown");
  });

  it("flags 401 and 403 as invalid", () => {
    expect(classifySession(observe(401, null))).toBe("invalid");
    expect(classifySession(observe(403, null))).toBe("invalid");
  });

  it("flags login_required as invalid", () => {
    expect(classifySession(observe(400, { message: "login_required" }))).toBe("invalid");
    expect(classifySession(observe(200, { require_login: true }))).toBe("invalid");
  });

  it("flags checkpoints as invalid", () => {
    expect(classifySession(observe(400, { message: "checkpoint_required" }))).toBe("invalid");
    expect(classifySession(observe(200, { checkpoint_url: "https://x" }))).toBe("invalid");
  });

  it("flags a redirect to login as invalid", () => {
    const login = "https://www.instagram.com/accounts/login/?next=/";
    expect(classifySession(observe(200, null, true, login))).toBe("invalid");
  });

  it("keeps rate limits and server errors unknown", () => {
    expect(classifySession(observe(429, null))).toBe("unknown");
    expect(classifySession(observe(500, null))).toBe("unknown");
  });
});

describe("checkSession", () => {
  it("sends credentials and the app headers once", async () => {
    const seen: unknown[] = [];
    const status = await checkSession(async (input, init) => {
      seen.push({ input, ...init });
      return respond(200, { user: { username: "me" } });
    });
    expect(status).toBe("valid");
    expect(seen).toEqual([
      {
        input: SESSION_CHECK_URL,
        credentials: "include",
        headers: { "x-ig-app-id": "936619743392459", "x-requested-with": "XMLHttpRequest" },
      },
    ]);
  });

  it("classifies an unauthorized response as invalid", async () => {
    expect(await checkSession(async () => respond(401, { message: "login_required" }))).toBe(
      "invalid",
    );
  });

  it("treats network failures as unknown", async () => {
    expect(
      await checkSession(async () => {
        throw new TypeError("offline");
      }),
    ).toBe("unknown");
  });

  it("treats an unreadable body as unknown", async () => {
    expect(await checkSession(async () => new Response("<html>", { status: 200 }))).toBe("unknown");
  });

  it("treats 429 as unknown", async () => {
    expect(await checkSession(async () => respond(429, {}))).toBe("unknown");
  });
});
