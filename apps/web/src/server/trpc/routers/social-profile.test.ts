import { following, postState } from "@nodistraction/db";
import { describe, expect, it } from "vitest";
import { OWNER } from "@/test/helpers";
import { advance, setup } from "@/test/social-world";

describe("profile", () => {
  it("caches a profile for sixty seconds", async () => {
    const { env, caller, engineCalls } = await setup();
    const first = await caller.profile.get({ userId: "7" });
    expect(first.profile.username).toBe("user_7");
    expect(first.stale).toBe(false);
    await caller.profile.get({ userId: "7" });
    expect(engineCalls("/v1/users/7/profile")).toHaveLength(1);
    await caller.profile.get({ userId: "9" });
    expect(engineCalls("/v1/users/9/profile")).toHaveLength(1);
    advance(env.clock, 61_000);
    await caller.profile.get({ userId: "7" });
    expect(engineCalls("/v1/users/7/profile")).toHaveLength(2);
  });

  it("serves the cached profile flagged stale on failure", async () => {
    const { env, caller, script } = await setup();
    await caller.profile.get({ userId: "7" });
    script.fail = true;
    advance(env.clock, 61_000);
    const served = await caller.profile.get({ userId: "7" });
    expect(served.stale).toBe(true);
    expect(served.profile.id).toBe("7");
  });

  it("refreshes a stale avatar of a followed account", async () => {
    const { env, caller } = await setup();
    await env.db.insert(following).values({
      ownerId: OWNER,
      igUserId: "7",
      username: "user_7",
      avatarUrl: "https://cdn/old.jpg",
    });
    await caller.profile.get({ userId: "7" });
    const [row] = await env.db.select().from(following);
    expect(row?.avatarUrl).toBe("https://cdn/new.jpg");
  });

  it("pages posts with the cursor and merges the stored flags", async () => {
    const { env, caller, engineCalls } = await setup();
    await env.db
      .insert(postState)
      .values({ ownerId: OWNER, mediaId: "p1", liked: true, saved: false, updatedAt: new Date(0) });
    const first = await caller.profile.posts({ userId: "7" });
    expect(first.nextCursor).toBe("next");
    expect(first.posts.map((item) => [item.id, item.liked, item.saved])).toEqual([
      ["p1", true, false],
      ["p2", false, false],
    ]);
    const second = await caller.profile.posts({ userId: "7", cursor: "next" });
    expect(second.nextCursor).toBeNull();
    expect(engineCalls("/v1/users/7/posts").map((call) => call.query)).toEqual([
      { amount: "24" },
      { amount: "24", cursor: "next" },
    ]);
  });
});

describe("comments.list", () => {
  it("lists comments", async () => {
    const { caller } = await setup();
    expect(await caller.comments.list({ mediaId: "55" })).toEqual([
      {
        id: "c1",
        userId: "8",
        username: "bob",
        avatarUrl: null,
        text: "bello",
        createdAt: 3,
        likeCount: 1,
        parentId: null,
      },
    ]);
  });

  it("rejects an invalid media id", async () => {
    const { env, caller } = await setup();
    await expect(caller.comments.list({ mediaId: "../x" })).rejects.toThrow();
    expect(env.engineCalls).toEqual([]);
  });
});
