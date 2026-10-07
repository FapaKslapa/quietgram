import { describe, expect, it } from "vitest";
import { clientWith, json, SECRET } from "#ig/engine/client-harness";
import { EngineSendDisabledError, EngineUnreachableError } from "#ig/engine/errors";
import { signRequest } from "#ig/engine/sign";
import { IgHttpError, IgThrottledError, SessionExpiredError } from "#ig/errors";

describe("engine client request signing", () => {
  it("signs a get with sorted query and sends the identity headers", async () => {
    const { client, seen } = clientWith(() => json({ posts: [], next_cursor: null }));
    await client.timeline("a b");
    const [request] = seen;
    expect(request?.url).toBe("https://engine.test/v1/timeline?cursor=a+b");
    expect(request?.headers.get("x-engine-timestamp")).toBe("1700000000");
    expect(request?.headers.get("x-ig-account-id")).toBe("1000");
    expect(request?.headers.get("user-agent")).toBe("nodistraction-worker/1.0");
    expect(request?.headers.get("x-engine-signature")).toBe(
      await signRequest({
        secret: SECRET,
        timestamp: "1700000000",
        method: "GET",
        target: "/v1/timeline?cursor=a+b",
        body: "",
      }),
    );
  });

  it("signs the exact body of a post", async () => {
    const { client, seen } = clientWith(() =>
      json({ id: "m1", sender_id: "1000", text: "ciao", kind: "text", sent_at_ms: 5 }),
    );
    await client.sendMessage("42", "ciao");
    const [request] = seen;
    expect(request?.method).toBe("POST");
    expect(request?.url).toBe("https://engine.test/v1/threads/42/messages");
    expect(request?.body).toBe('{"text":"ciao"}');
    expect(request?.headers.get("x-engine-signature")).toBe(
      "04b56bf05c8c699fa1ddd5eff8d755f2f2a5f1795884056dca2643fa76a315a0",
    );
  });

  it("sends the session id in the put body", async () => {
    const { client, seen } = clientWith(() => json({ active: true, username: "me" }));
    expect(await client.putSession("123%3Aabc")).toEqual({ active: true, username: "me" });
    expect(seen[0]?.method).toBe("PUT");
    expect(seen[0]?.body).toBe('{"sessionid":"123%3Aabc"}');
  });
});

describe("engine client errors", () => {
  const failing = (status: number, body: unknown) =>
    clientWith(() => json(body, status)).client.sessionStatus();

  it("maps throttled to IgThrottledError", async () => {
    await expect(failing(429, { code: "throttled", retry_after_seconds: 1800 })).rejects.toThrow(
      IgThrottledError,
    );
  });

  it("maps session_expired to SessionExpiredError", async () => {
    await expect(failing(401, { code: "session_expired" })).rejects.toThrow(SessionExpiredError);
  });

  it("maps send_disabled to EngineSendDisabledError", async () => {
    await expect(failing(403, { code: "send_disabled" })).rejects.toThrow(EngineSendDisabledError);
  });

  it("maps upstream_error and unknown failures to IgHttpError with the status", async () => {
    await expect(failing(502, { code: "upstream_error" })).rejects.toMatchObject({
      name: "IgHttpError",
      status: 502,
    });
    await expect(failing(401, { code: "unauthorized" })).rejects.toBeInstanceOf(IgHttpError);
    await expect(
      clientWith(() => new Response("<html>", { status: 500 })).client.sessionStatus(),
    ).rejects.toMatchObject({ status: 500 });
  });

  it("maps a network failure to EngineUnreachableError", async () => {
    const { client } = clientWith(() => new TypeError("fetch failed"));
    await expect(client.sessionStatus()).rejects.toThrow(EngineUnreachableError);
  });
});
