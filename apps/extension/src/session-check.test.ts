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

const valid = { status: "valid", reason: null };
const invalid = { status: "invalid", reason: null };
const unknown = (reason: string) => ({ status: "unknown", reason });

describe("classifySession", () => {
  it("accepts a 200 with a username", () => {
    expect(classifySession(observe(200, { user: { username: "me" } }))).toEqual(valid);
  });

  it("accepts a 200 with a user pk or id", () => {
    expect(classifySession(observe(200, { user: { pk: "1" } }))).toEqual(valid);
    expect(classifySession(observe(200, { user: { id: 2 } }))).toEqual(valid);
  });

  it("accepts a 200 with status ok", () => {
    expect(classifySession(observe(200, { status: "ok" }))).toEqual(valid);
  });

  it("does not trust status ok with login signals", () => {
    expect(classifySession(observe(200, { status: "ok", require_login: true }))).toEqual(invalid);
  });

  it("reports a 200 without a user", () => {
    expect(classifySession(observe(200, {}))).toEqual(unknown("no-user"));
    expect(classifySession(observe(200, { user: {} }))).toEqual(unknown("no-user"));
  });

  it("reports a 200 that is not an object", () => {
    expect(classifySession(observe(200, undefined))).toEqual(unknown("unreadable-body"));
    expect(classifySession(observe(200, null))).toEqual(unknown("unreadable-body"));
  });

  it("flags 401 and 403 as invalid", () => {
    expect(classifySession(observe(401, undefined))).toEqual(invalid);
    expect(classifySession(observe(403, undefined))).toEqual(invalid);
  });

  it("flags login_required as invalid", () => {
    expect(classifySession(observe(400, { message: "login_required" }))).toEqual(invalid);
    expect(classifySession(observe(200, { require_login: true }))).toEqual(invalid);
  });

  it("flags checkpoints as invalid", () => {
    expect(classifySession(observe(400, { message: "checkpoint_required" }))).toEqual(invalid);
    expect(classifySession(observe(200, { checkpoint_url: "https://x" }))).toEqual(invalid);
  });

  it("flags a redirect to login as invalid", () => {
    const login = "https://www.instagram.com/accounts/login/?next=/";
    expect(classifySession(observe(200, undefined, true, login))).toEqual(invalid);
  });

  it("reports throttling", () => {
    expect(classifySession(observe(429, undefined))).toEqual(unknown("throttled"));
  });

  it("keeps other statuses unknown with the code", () => {
    expect(classifySession(observe(500, undefined))).toEqual(unknown("http-500"));
    expect(classifySession(observe(400, { message: "useragent mismatch" }))).toEqual(
      unknown("http-400"),
    );
    expect(classifySession(observe(404, {}))).toEqual(unknown("http-404"));
  });
});

describe("checkSession", () => {
  it("sends credentials and the app headers once", async () => {
    const seen: unknown[] = [];
    const result = await checkSession(async (input, init) => {
      seen.push({ input, ...init });
      return respond(200, { user: { username: "me" } });
    });
    expect(result).toEqual(valid);
    expect(seen).toEqual([
      {
        input: SESSION_CHECK_URL,
        credentials: "include",
        headers: { "x-ig-app-id": "936619743392459", "x-requested-with": "XMLHttpRequest" },
      },
    ]);
  });

  it("classifies an unauthorized response as invalid", async () => {
    expect(await checkSession(async () => respond(401, { message: "login_required" }))).toEqual(
      invalid,
    );
  });

  it("reports network failures", async () => {
    expect(
      await checkSession(async () => {
        throw new TypeError("offline");
      }),
    ).toEqual(unknown("network"));
  });

  it("reports an unreadable body", async () => {
    expect(await checkSession(async () => new Response("<html>", { status: 200 }))).toEqual(
      unknown("unreadable-body"),
    );
  });

  it("reports throttling", async () => {
    expect(await checkSession(async () => respond(429, {}))).toEqual(unknown("throttled"));
  });

  it("reports the status code of a user agent mismatch", async () => {
    expect(
      await checkSession(async () => respond(400, { message: "useragent mismatch" })),
    ).toEqual(unknown("http-400"));
  });
});
