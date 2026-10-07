import { describe, expect, it } from "vitest";
import { clientWith, json, post, SECRET } from "#ig/engine/client-harness";
import { EngineInteractionsDisabledError } from "#ig/engine/errors";
import { signRequest } from "#ig/engine/sign";
import { IgThrottledError, SessionExpiredError } from "#ig/errors";

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
