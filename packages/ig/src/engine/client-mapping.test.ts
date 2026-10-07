import { describe, expect, it } from "vitest";
import { clientWith, json, post } from "#ig/engine/client-harness";

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
