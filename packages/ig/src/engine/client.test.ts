import { describe, expect, it } from "vitest";
import { createEngineClient } from "#ig/engine/client";
import {
  EngineInteractionsDisabledError,
  EngineSendDisabledError,
  EngineUnreachableError,
} from "#ig/engine/errors";
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
  code: "Cabc123",
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
      { id: "1", username: "ada", avatarUrl: null, isVerified: true, latestReelMedia: null },
    ]);
    expect(seen[0]?.url).toBe("https://engine.test/v1/following?amount=200");
    await client.followers(5);
    expect(seen[1]?.url).toBe("https://engine.test/v1/followers?amount=5");
  });

  it("maps posts and drops reels", async () => {
    const { client, seen } = clientWith(() =>
      json({ posts: [post(), post({ id: "p2", product_type: "clips" })] }),
    );
    const page = await client.userPosts("7", 3);
    expect(page.nextCursor).toBeNull();
    expect(page.posts).toEqual([
      {
        id: "p1",
        code: "Cabc123",
        productType: "feed",
        authorId: "7",
        authorUsername: "ada",
        caption: null,
        takenAt: 1_700_000_000_123,
        media: [{ kind: "image", url: "https://cdn/a.jpg", width: 10, height: 20 }],
      },
    ]);
    expect(seen[0]?.url).toBe("https://engine.test/v1/users/7/posts?amount=3");
    const saved = await client.saved(50);
    expect(saved.map((entry) => entry.productType)).toEqual(["feed", "clips"]);
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
              { id: "m1", sender_id: null, text: null, kind: "photo", sent_at_ms: 3 },
              { id: "m2", sender_id: "9", text: "ciao", kind: "text", sent_at_ms: 4 },
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
      { id: "m1", senderId: "", type: "other", kind: "photo", text: null, sentAt: 3 },
      { id: "m2", senderId: "9", type: "text", kind: "text", text: "ciao", sentAt: 4 },
    ]);
  });

  it("rejects a response that does not match the schema", async () => {
    const { client } = clientWith(() => json({ users: "nope" }));
    await expect(client.following(1)).rejects.toMatchObject({
      name: "EngineResponseError",
      reason: "users",
    });
  });

  it("tolerates nulls, missing fields, numeric ids and unknown keys", async () => {
    const { client } = clientWith(() =>
      json({
        posts: [
          {
            id: 9_007_199_254_740_990,
            author_id: 7,
            author_username: null,
            caption: undefined,
            taken_at_ms: 1,
            product_type: null,
            surprise: { deep: true },
            media: [
              { kind: "image", url: "https://cdn/a.jpg", width: null, height: "x" },
              { kind: "image", url: "" },
              { kind: "gif", url: "https://cdn/b.gif", width: 1, height: 1 },
              null,
            ],
          },
          { id: "p3", author_id: "7", author_username: "ada", taken_at_ms: 2 },
        ],
        next_cursor: null,
      }),
    );
    const page = await client.timeline();
    expect(page.nextCursor).toBeNull();
    expect(page.posts).toHaveLength(2);
    expect(page.posts[0]).toMatchObject({
      authorId: "7",
      authorUsername: "",
      caption: null,
      code: null,
      productType: "feed",
      media: [{ kind: "image", url: "https://cdn/a.jpg", width: 0, height: 0 }],
    });
    expect(page.posts[1]?.media).toEqual([]);
  });

  it("tolerates odd messages and threads", async () => {
    const { client } = clientWith((seen) =>
      seen.url.includes("/threads/")
        ? json({
            messages: [
              { id: 9_007_199_254_740_991, sender_id: null, text: null, sent_at_ms: 3, extra: 1 },
              { id: "m2", sender_id: 5, text: "ciao", kind: "bogus", sent_at_ms: 4 },
            ],
          })
        : json({ threads: [{ id: 12, title: null, last_activity_at_ms: 8, unread: null }] }),
    );
    expect(await client.threads(1)).toEqual([
      { id: "12", title: "", lastActivityAt: 8, unread: false },
    ]);
    const messages = await client.thread("1", 1);
    expect(messages.map((message) => [message.senderId, message.kind])).toEqual([
      ["", "other"],
      ["5", "text"],
    ]);
  });

  it("reports an unreachable engine with a short reason", async () => {
    const failure = new TypeError("fetch failed");
    const { client } = clientWith(() => failure);
    await expect(client.sessionStatus()).rejects.toMatchObject({
      name: "EngineUnreachableError",
      reason: "TypeError",
    });
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

describe("engine client social reads", () => {
  it("pages user posts with a cursor and keeps the next one", async () => {
    const { client, seen } = clientWith(() => json({ posts: [post()], next_cursor: "n2" }));
    const page = await client.userPosts("7", 24, "c1");
    expect(page.nextCursor).toBe("n2");
    expect(seen[0]?.url).toBe("https://engine.test/v1/users/7/posts?amount=24&cursor=c1");
  });

  it("maps the tray tolerantly", async () => {
    const { client, seen } = clientWith(() =>
      json({
        tray: [
          {
            user_id: 5,
            username: "ada",
            avatar_url: "https://cdn/a.jpg",
            latest_reel_media: 9,
            seen: true,
          },
          { user_id: "6", username: null, seen: null },
          { username: "broken" },
        ],
      }),
    );
    expect(await client.storiesTray()).toEqual([
      {
        userId: "5",
        username: "ada",
        avatarUrl: "https://cdn/a.jpg",
        latestReelMedia: 9,
        seen: true,
      },
      { userId: "6", username: "", avatarUrl: null, latestReelMedia: null, seen: false },
    ]);
    expect(seen[0]?.url).toBe("https://engine.test/v1/stories/tray");
  });

  it("maps stories and drops malformed ones", async () => {
    const { client } = clientWith(() =>
      json({
        stories: [
          {
            id: "s1",
            taken_at_ms: 1,
            expires_at_ms: 2,
            media: { kind: "video", url: "https://cdn/s.mp4", width: 0, height: 0 },
            product_type: "story",
          },
          { id: "s2", taken_at_ms: 1 },
        ],
      }),
    );
    expect(await client.userStories("5")).toEqual([
      {
        id: "s1",
        takenAt: 1,
        expiresAt: 2,
        media: { kind: "video", url: "https://cdn/s.mp4", width: 0, height: 0 },
        productType: "story",
      },
    ]);
  });

  it("maps a profile with missing optional fields", async () => {
    const { client, seen } = clientWith(() =>
      json({ id: 5, username: "ada", follower_count: 10, external_url: "", surprise: 1 }),
    );
    expect(await client.userProfile("5")).toEqual({
      id: "5",
      username: "ada",
      fullName: "",
      biography: "",
      avatarUrl: null,
      isPrivate: false,
      isVerified: false,
      isBusiness: false,
      followerCount: 10,
      followingCount: 0,
      mediaCount: 0,
      externalUrl: null,
      friendship: { following: false, followedBy: false },
    });
    expect(seen[0]?.url).toBe("https://engine.test/v1/users/5/profile");
  });

  it("maps comments", async () => {
    const { client, seen } = clientWith(() =>
      json({
        comments: [
          {
            id: "c1",
            user_id: 3,
            username: "bob",
            text: "bello",
            created_at_ms: 5,
            like_count: null,
            parent_id: 2,
          },
        ],
      }),
    );
    expect(await client.comments("77_5", 20)).toEqual([
      {
        id: "c1",
        userId: "3",
        username: "bob",
        avatarUrl: null,
        text: "bello",
        createdAt: 5,
        likeCount: 0,
        parentId: "2",
      },
    ]);
    expect(seen[0]?.url).toBe("https://engine.test/v1/posts/77_5/comments?amount=20");
  });
});

describe("engine client interactions", () => {
  it("sends each write with the right verb and path", async () => {
    const { client, seen } = clientWith(() => json({ ok: true }));
    await client.like("77");
    await client.unlike("77");
    await client.save("77");
    await client.unsave("77");
    await client.addComment("77", "  ciao  ");
    await client.deleteComment("77", "9");
    expect(
      seen.map((entry) => `${entry.method} ${entry.url.replace("https://engine.test", "")}`),
    ).toEqual([
      "POST /v1/posts/77/like",
      "DELETE /v1/posts/77/like",
      "POST /v1/posts/77/save",
      "DELETE /v1/posts/77/save",
      "POST /v1/posts/77/comments",
      "DELETE /v1/posts/77/comments/9",
    ]);
    expect(seen[4]?.body).toBe('{"text":"ciao"}');
    expect(seen[1]?.headers.get("x-engine-signature")).toBe(
      await signRequest({
        secret: SECRET,
        timestamp: "1700000000",
        method: "DELETE",
        target: "/v1/posts/77/like",
        body: "",
      }),
    );
  });

  it("validates comment text before any request", async () => {
    const { client, seen } = clientWith(() => json({ ok: true }));
    await expect(client.addComment("77", "   ")).rejects.toThrow(RangeError);
    await expect(client.addComment("77", "x".repeat(2201))).rejects.toThrow(RangeError);
    expect(seen).toHaveLength(0);
  });

  it("maps interactions_disabled, throttling and expiry", async () => {
    const disabled = clientWith(() => json({ code: "interactions_disabled" }, 403));
    await expect(disabled.client.like("1")).rejects.toThrow(EngineInteractionsDisabledError);
    const throttled = clientWith(() => json({ code: "throttled", retry_after_seconds: 5 }, 429));
    await expect(throttled.client.save("1")).rejects.toThrow(IgThrottledError);
    const expired = clientWith(() => json({ code: "session_expired" }, 401));
    await expect(expired.client.addComment("1", "a")).rejects.toThrow(SessionExpiredError);
  });

  it("rejects an acknowledgement that is not ok", async () => {
    const { client } = clientWith(() => json({ ok: false }));
    await expect(client.like("1")).rejects.toMatchObject({ name: "EngineResponseError" });
  });
});
