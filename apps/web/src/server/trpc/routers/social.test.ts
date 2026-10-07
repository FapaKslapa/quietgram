import { following, postState, saved, storyTray } from "@nodistraction/db";
import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createCallerFactory } from "@/server/trpc/init";
import { appRouter } from "@/server/trpc/routers/_app";
import { createTestEnv, type EngineCall, EngineFailure, OWNER } from "@/test/helpers";

const createCaller = createCallerFactory(appRouter);

const INTERACTIONS_OFF = "Le interazioni sono disattivate: attivale in Profilo.";

const profileBody = (id: string) => ({
  id,
  username: `user_${id}`,
  full_name: "Nome",
  biography: "bio",
  avatar_url: "https://cdn/new.jpg",
  is_private: false,
  is_verified: true,
  is_business: false,
  follower_count: 10,
  following_count: 5,
  media_count: 2,
  external_url: null,
  friendship: { following: true, followed_by: false },
});

const post = (id: string, productType = "feed") => ({
  id,
  code: `c${id}`,
  author_id: "7",
  author_username: "ada",
  caption: null,
  taken_at_ms: 5,
  product_type: productType,
  media: [{ kind: "image", url: "https://cdn/x.jpg", width: 1, height: 1 }],
});

type Script = { fail: boolean };

const engine =
  (script: Script) =>
  (call: EngineCall): unknown => {
    if (call.path === "/v1/session") return { active: true, username: "me" };
    if (script.fail) return new EngineFailure(502, { code: "upstream_error" });
    if (call.path === "/v1/stories/tray") {
      return {
        tray: [
          {
            user_id: "7",
            username: "ada",
            avatar_url: "https://cdn/ada-new.jpg",
            latest_reel_media: 9,
            seen: false,
          },
          { user_id: "8", username: "bob", avatar_url: null, latest_reel_media: 4, seen: true },
        ],
      };
    }
    if (call.path === "/v1/users/7/stories") {
      return {
        stories: [
          {
            id: "s1",
            taken_at_ms: 1,
            expires_at_ms: 2,
            media: { kind: "image", url: "https://cdn/s.jpg", width: 0, height: 0 },
            product_type: "story",
          },
        ],
      };
    }
    if (call.path.endsWith("/profile")) return profileBody(call.path.split("/")[3] ?? "");
    if (call.path === "/v1/users/7/posts") {
      return { posts: [post("p1"), post("p2")], next_cursor: call.query.cursor ? null : "next" };
    }
    if (call.path === "/v1/posts/55/comments" && call.method === "GET") {
      return {
        comments: [
          {
            id: "c1",
            user_id: "8",
            username: "bob",
            text: "bello",
            created_at_ms: 3,
            like_count: 1,
            parent_id: null,
          },
        ],
      };
    }
    if (call.path.startsWith("/v1/posts/")) return { ok: true };
    throw new Error(`unexpected ${call.method} ${call.path}`);
  };

const setup = async (options: { interactionsEnabled?: boolean } = {}) => {
  const script: Script = { fail: false };
  const env = await createTestEnv(undefined, { engine: engine(script), ...options });
  const caller = createCaller(env.context);
  const writes = () => env.engineCalls.filter((call) => call.method !== "GET");
  const engineCalls = (path: string) => env.engineCalls.filter((call) => call.path === path);
  return { env, caller, script, writes, engineCalls };
};

const advance = (clock: { current: Date }, ms: number) => {
  clock.current = new Date(clock.current.getTime() + ms);
};

describe("stories.tray", () => {
  it("stores the tray in instagram order and serves it inside the interval", async () => {
    const { env, caller, engineCalls } = await setup();
    const first = await caller.stories.tray();
    expect(first.stale).toBe(false);
    expect(first.entries.map((entry) => entry.userId)).toEqual(["7", "8"]);
    await caller.stories.tray();
    expect(engineCalls("/v1/stories/tray")).toHaveLength(1);
    advance(env.clock, 31_000);
    await caller.stories.tray();
    expect(engineCalls("/v1/stories/tray")).toHaveLength(2);
  });

  it("serves the stored tray flagged stale when the engine fails", async () => {
    const { env, caller, script } = await setup();
    await caller.stories.tray();
    script.fail = true;
    advance(env.clock, 60_000);
    const served = await caller.stories.tray();
    expect(served.stale).toBe(true);
    expect(served.entries).toHaveLength(2);
  });

  it("fails when nothing is stored and the engine fails", async () => {
    const { caller, script } = await setup();
    script.fail = true;
    await expect(caller.stories.tray()).rejects.toMatchObject({ code: "BAD_GATEWAY" });
  });

  it("refreshes the avatar of a followed account only when it is older than three days", async () => {
    const { env, caller } = await setup();
    await env.db.insert(following).values([
      {
        ownerId: OWNER,
        igUserId: "7",
        username: "ada",
        avatarUrl: "https://cdn/old.jpg",
        avatarRefreshedAt: new Date(env.clock.current.getTime() - 86_400_000),
      },
      { ownerId: OWNER, igUserId: "8", username: "bob", avatarUrl: "https://cdn/bob.jpg" },
    ]);
    await caller.stories.tray();
    const rows = await env.db.select().from(following).where(eq(following.ownerId, OWNER));
    const byId = new Map(rows.map((row) => [row.igUserId, row]));
    expect(byId.get("7")?.avatarUrl).toBe("https://cdn/old.jpg");
    expect(byId.get("8")?.avatarUrl).toBe("https://cdn/bob.jpg");
    advance(env.clock, 3 * 86_400_000);
    await caller.stories.tray();
    const later = await env.db.select().from(following).where(eq(following.igUserId, "7"));
    expect(later[0]?.avatarUrl).toBe("https://cdn/ada-new.jpg");
    expect(later[0]?.avatarRefreshedAt?.getTime()).toBe(env.clock.current.getTime());
    const stored = await env.db.select().from(storyTray).where(eq(storyTray.ownerId, OWNER));
    expect(stored).toHaveLength(2);
  });

  it("never adds accounts that are not followed", async () => {
    const { env, caller } = await setup();
    await caller.stories.tray();
    expect(await env.db.select().from(following)).toEqual([]);
  });
});

describe("stories.user", () => {
  it("returns the stories without marking anything", async () => {
    const { env, caller } = await setup();
    const stories = await caller.stories.user({ userId: "7" });
    expect(stories[0]).toMatchObject({ id: "s1", productType: "story" });
    expect(env.engineCalls.every((call) => call.method === "GET")).toBe(true);
  });

  it("rejects an invalid user id before any call", async () => {
    const { env, caller } = await setup();
    await expect(caller.stories.user({ userId: "x" })).rejects.toThrow();
    expect(env.engineCalls).toEqual([]);
  });
});

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

describe("interactions", () => {
  it.each<[string, (caller: ReturnType<typeof createCaller>) => Promise<unknown>]>([
    ["like", (caller) => caller.interactions.like({ mediaId: "55" })],
    ["unlike", (caller) => caller.interactions.unlike({ mediaId: "55" })],
    ["save", (caller) => caller.interactions.save({ mediaId: "55" })],
    ["unsave", (caller) => caller.interactions.unsave({ mediaId: "55" })],
    ["comment", (caller) => caller.interactions.comment({ mediaId: "55", text: "ciao" })],
    [
      "deleteComment",
      (caller) => caller.interactions.deleteComment({ mediaId: "55", commentId: "9" }),
    ],
  ])("%s is refused while interactions are off", async (_name, run) => {
    const { env, caller } = await setup();
    await expect(run(caller)).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
      message: INTERACTIONS_OFF,
    });
    expect(env.engineCalls).toEqual([]);
    expect(await env.db.select().from(postState)).toEqual([]);
  });

  it("likes and records the state, then unlikes", async () => {
    const { env, caller, writes } = await setup({ interactionsEnabled: true });
    expect(await caller.interactions.like({ mediaId: "55" })).toEqual({
      liked: true,
      saved: false,
    });
    expect(writes().map((call) => `${call.method} ${call.path}`)).toEqual([
      "POST /v1/posts/55/like",
    ]);
    expect(await caller.interactions.unlike({ mediaId: "55" })).toEqual({
      liked: false,
      saved: false,
    });
    const [row] = await env.db.select().from(postState);
    expect(row).toMatchObject({ mediaId: "55", liked: false });
  });

  it("keeps like and save independent", async () => {
    const { caller } = await setup({ interactionsEnabled: true });
    await caller.interactions.like({ mediaId: "55" });
    expect(await caller.interactions.save({ mediaId: "55" })).toEqual({
      liked: true,
      saved: true,
    });
  });

  it("rolls the state back when the engine fails", async () => {
    const { env, caller, script } = await setup({ interactionsEnabled: true });
    await caller.interactions.like({ mediaId: "55" });
    script.fail = true;
    await expect(caller.interactions.save({ mediaId: "55" })).rejects.toMatchObject({
      code: "BAD_GATEWAY",
    });
    const [row] = await env.db.select().from(postState);
    expect(row).toMatchObject({ liked: true, saved: false });
    await expect(caller.interactions.like({ mediaId: "66" })).rejects.toThrow();
    const rows = await env.db
      .select()
      .from(postState)
      .where(and(eq(postState.ownerId, OWNER), eq(postState.mediaId, "66")));
    expect(rows).toEqual([]);
  });

  it("forgets a saved post locally after unsave", async () => {
    const { env, caller } = await setup({ interactionsEnabled: true });
    await env.db.insert(saved).values({
      id: "55",
      ownerId: OWNER,
      authorUsername: "ada",
      mediaJson: "[]",
      position: 0,
    });
    await caller.interactions.unsave({ mediaId: "55" });
    expect(await caller.saved.list()).toEqual([]);
  });

  it("validates comment text before any call", async () => {
    const { env, caller } = await setup({ interactionsEnabled: true });
    for (const text of ["", "   \n", "x".repeat(2201)]) {
      await expect(caller.interactions.comment({ mediaId: "55", text })).rejects.toMatchObject({
        code: "BAD_REQUEST",
      });
    }
    expect(env.engineCalls).toEqual([]);
  });

  it("posts a trimmed comment and deletes one", async () => {
    const { caller, writes } = await setup({ interactionsEnabled: true });
    await caller.interactions.comment({ mediaId: "55", text: "  ciao  " });
    await caller.interactions.deleteComment({ mediaId: "55", commentId: "9" });
    expect(writes().map((call) => [call.method, call.path, call.body])).toEqual([
      ["POST", "/v1/posts/55/comments", '{"text":"ciao"}'],
      ["DELETE", "/v1/posts/55/comments/9", ""],
    ]);
  });

  it("maps an engine that has interactions off to a bad gateway", async () => {
    const env = await createTestEnv(undefined, {
      interactionsEnabled: true,
      engine: (call) =>
        call.path === "/v1/session"
          ? { active: true, username: "me" }
          : new EngineFailure(403, { code: "interactions_disabled" }),
    });
    await expect(
      createCaller(env.context).interactions.like({ mediaId: "55" }),
    ).rejects.toMatchObject({
      code: "BAD_GATEWAY",
      message: expect.stringContaining("interazioni disattivate sul motore"),
    });
    expect(await env.db.select().from(postState)).toEqual([]);
  });

  it("reports an unsupported capability on the direct source", async () => {
    const env = await createTestEnv(undefined, { interactionsEnabled: true });
    await expect(
      createCaller(env.context).interactions.like({ mediaId: "55" }),
    ).rejects.toMatchObject({ code: "BAD_GATEWAY" });
    expect(await env.db.select().from(postState)).toEqual([]);
  });

  it("rejects anonymous callers", async () => {
    const env = await createTestEnv();
    const caller = createCaller({ ...env.context, getSession: async () => null });
    await expect(caller.interactions.like({ mediaId: "55" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(caller.stories.tray()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

describe("saved.list flags", () => {
  it("defaults saved to true and exposes liked and the author avatar", async () => {
    const { env, caller } = await setup();
    await env.db
      .insert(following)
      .values({ ownerId: OWNER, igUserId: "7", username: "ada", avatarUrl: "https://cdn/a.jpg" });
    await env.db.insert(saved).values({
      id: "55",
      ownerId: OWNER,
      authorUsername: "ada",
      mediaJson: "[]",
      position: 0,
    });
    await env.db
      .insert(postState)
      .values({ ownerId: OWNER, mediaId: "55", liked: true, saved: true, updatedAt: new Date(0) });
    expect(await caller.saved.list()).toMatchObject([
      { id: "55", liked: true, saved: true, authorAvatarUrl: "https://cdn/a.jpg" },
    ]);
  });
});
