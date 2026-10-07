import { following, postState, saved } from "@nodistraction/db";
import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createTestEnv, EngineFailure, OWNER } from "@/test/helpers";
import { createCaller, INTERACTIONS_OFF, setup } from "@/test/social-world";

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
