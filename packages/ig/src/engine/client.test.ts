import { describe, expect, it } from "vitest";
import { createEngineClient } from "#ig/engine/client";
import { EngineSendDisabledError, EngineUnreachableError } from "#ig/engine/errors";
import { signRequest } from "#ig/engine/sign";
import { IgHttpError, IgThrottledError, SessionExpiredError } from "#ig/errors";

const SECRET = "test-secret-0123456789";
const NOW_MS = 1_700_000_000_000;

type Seen = { url: string; method: string; headers: Headers; body: string };

const fakeFetch = (respond: (seen: Seen) => Response | Error) => {
  const seen: Seen[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    const entry: Seen = {
      url: String(input),
      method: init?.method ?? "GET",
      headers: new Headers(init?.headers),
      body: typeof init?.body === "string" ? init.body : "",
    };
    seen.push(entry);
    const result = respond(entry);
    if (result instanceof Error) throw result;
    return result;
  };
  return { fetcher, seen };
};

const json = (body: unknown, status = 200): Response => Response.json(body, { status });

const clientWith = (respond: (seen: Seen) => Response | Error) => {
  const fake = fakeFetch(respond);
  const client = createEngineClient({
    baseUrl: "https://engine.test/",
    secret: SECRET,
    accountId: "1000",
    fetcher: fake.fetcher,
    now: () => NOW_MS,
  });
  return { client, seen: fake.seen };
};

const post = (overrides: Record<string, unknown> = {}) => ({
  id: "p1",
  author_id: "7",
  author_username: "ada",
  caption: null,
  taken_at_ms: 1_700_000_000_123,
  product_type: "feed",
  media: [{ kind: "image", url: "https://cdn/a.jpg", width: 10, height: 20 }],
  ...overrides,
});

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
      json({ id: "m1", sender_id: "1000", text: "ciao", sent_at_ms: 5 }),
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

describe("engine client mapping", () => {
  it("maps users", async () => {
    const { client, seen } = clientWith(() =>
      json({
        users: [
          {
            id: "1",
            username: "ada",
            avatar_url: null,
            is_verified: true,
            is_business: false,
            follower_count: null,
          },
        ],
      }),
    );
    expect(await client.following(200)).toEqual([
      { id: "1", username: "ada", avatarUrl: null, isVerified: true },
    ]);
    expect(seen[0]?.url).toBe("https://engine.test/v1/following?amount=200");
    await client.followers(5);
    expect(seen[1]?.url).toBe("https://engine.test/v1/followers?amount=5");
  });

  it("maps posts and drops reels", async () => {
    const { client, seen } = clientWith(() =>
      json({ posts: [post(), post({ id: "p2", product_type: "clips" })] }),
    );
    expect(await client.userPosts("7", 3)).toEqual([
      {
        id: "p1",
        authorId: "7",
        authorUsername: "ada",
        caption: null,
        takenAt: 1_700_000_000_123,
        media: [{ kind: "image", url: "https://cdn/a.jpg", width: 10, height: 20 }],
      },
    ]);
    expect(seen[0]?.url).toBe("https://engine.test/v1/users/7/posts?amount=3");
    expect(await client.saved(50)).toHaveLength(1);
  });

  it("maps the timeline page", async () => {
    const { client } = clientWith(() => json({ posts: [post()], next_cursor: "next" }));
    const page = await client.timeline();
    expect(page.nextCursor).toBe("next");
    expect(page.posts).toHaveLength(1);
  });

  it("maps threads and messages", async () => {
    const { client } = clientWith((seen) =>
      seen.url.includes("/threads/")
        ? json({
            messages: [
              { id: "m1", sender_id: null, text: null, sent_at_ms: 3 },
              { id: "m2", sender_id: "9", text: "ciao", sent_at_ms: 4 },
            ],
          })
        : json({
            threads: [
              { id: "t1", title: "Ada", last_activity_at_ms: 8, unread: true, preview: "x" },
            ],
          }),
    );
    expect(await client.threads(20)).toEqual([
      { id: "t1", title: "Ada", lastActivityAt: 8, unread: true },
    ]);
    expect(await client.thread("t1", 20)).toEqual([
      { id: "m1", senderId: "", type: "other", text: null, sentAt: 3 },
      { id: "m2", senderId: "9", type: "text", text: "ciao", sentAt: 4 },
    ]);
  });

  it("rejects a response that does not match the schema", async () => {
    const { client } = clientWith(() => json({ users: [{ id: 1 }] }));
    await expect(client.following(1)).rejects.toThrow();
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
