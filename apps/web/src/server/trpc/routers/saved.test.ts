import { postState } from "@nodistraction/db";
import { IgHttpError, SessionExpiredError } from "@nodistraction/ig";
import savedFixture from "@nodistraction/ig/fixtures/saved.json" with { type: "json" };
import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { SAVED_COOLDOWN_MS } from "@/lib/sync/cooldown";
import { createCallerFactory } from "@/server/trpc/init";
import { appRouter } from "@/server/trpc/routers/_app";
import { createTestEnv, OWNER } from "@/test/helpers";

const createCaller = createCallerFactory(appRouter);

const item = (pk: string, username: string) => ({
  media: {
    pk,
    product_type: "feed",
    taken_at: 1_790_000_000,
    user: { pk: "1", username },
    caption: null,
    image_versions2: { candidates: [{ url: "https://example.invalid/i", width: 1, height: 1 }] },
  },
});

describe("saved router", () => {
  it("replaces stored rows and keeps instagram order", async () => {
    let response: unknown = { items: [item("b", "u_b"), item("a", "u_a"), item("c", "u_c")] };
    const env = await createTestEnv(() => response);
    const caller = createCaller(env.context);
    await caller.saved.sync();
    expect((await caller.saved.list()).map((post) => post.id)).toEqual(["b", "a", "c"]);
    response = { items: [item("c", "u_c"), item("d", "u_d")] };
    env.clock.current = new Date(env.clock.current.getTime() + SAVED_COOLDOWN_MS);
    await caller.saved.sync();
    expect((await caller.saved.list()).map((post) => post.id)).toEqual(["c", "d"]);
  });

  it("keeps reels from the recorded page", async () => {
    const env = await createTestEnv(() => savedFixture);
    const caller = createCaller(env.context);
    await caller.saved.sync();
    expect(await caller.saved.list()).toHaveLength(3);
  });

  it("reports an expired session and keeps stored rows", async () => {
    let fail = false;
    const env = await createTestEnv(() => {
      if (fail) throw new SessionExpiredError();
      return { items: [item("a", "u_a")] };
    });
    const caller = createCaller(env.context);
    await caller.saved.sync();
    fail = true;
    env.clock.current = new Date(env.clock.current.getTime() + SAVED_COOLDOWN_MS);
    await expect(caller.saved.sync()).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(await caller.saved.list()).toHaveLength(1);
  });

  it("skips the instagram call while the cooldown is active", async () => {
    const env = await createTestEnv(() => ({ items: [item("a", "u_a")] }));
    const caller = createCaller(env.context);
    await caller.saved.sync();
    const calls = env.calls.length;
    await caller.saved.sync();
    expect(env.calls).toHaveLength(calls);
  });

  it("allows a retry right after a failed sync", async () => {
    let fail = true;
    const env = await createTestEnv(() => {
      if (fail) throw new IgHttpError(500);
      return { items: [item("a", "u_a")] };
    });
    const caller = createCaller(env.context);
    await expect(caller.saved.sync()).rejects.toBeDefined();
    fail = false;
    await caller.saved.sync();
    expect(await caller.saved.list()).toHaveLength(1);
  });

  it("keeps the previous list when the write fails midway", async () => {
    let response: unknown = { items: [item("a", "u_a")] };
    const env = await createTestEnv(() => response);
    const caller = createCaller(env.context);
    await caller.saved.sync();
    env.clock.current = new Date(env.clock.current.getTime() + SAVED_COOLDOWN_MS);
    response = { items: [item("b", "u_b"), item("b2", "u_b2")] };
    await env.db.run(sql`create trigger fail_saved before insert on saved
      when new.id = 'b2' begin select raise(abort, 'boom'); end`);
    await expect(caller.saved.sync()).rejects.toBeDefined();
    expect((await caller.saved.list()).map((post) => post.id)).toEqual(["a"]);
    await env.db.run(sql`drop trigger fail_saved`);
    await caller.saved.sync();
    expect((await caller.saved.list()).map((post) => post.id)).toEqual(["b", "b2"]);
  });

  it("reconciles the saved flag with the instagram list", async () => {
    let response: unknown = { items: [item("a", "u_a"), item("b", "u_b")] };
    const env = await createTestEnv(() => response);
    await env.db.insert(postState).values([
      { ownerId: OWNER, mediaId: "b", liked: true, saved: false, updatedAt: new Date(0) },
      { ownerId: OWNER, mediaId: "z", liked: false, saved: true, updatedAt: new Date(0) },
    ]);
    const caller = createCaller(env.context);
    await caller.saved.sync();
    const rows = await env.db.select().from(postState);
    const flags = Object.fromEntries(rows.map((row) => [row.mediaId, [row.liked, row.saved]]));
    expect(flags).toEqual({ a: [false, true], b: [true, true], z: [false, false] });
    response = { items: [] };
    env.clock.current = new Date(env.clock.current.getTime() + SAVED_COOLDOWN_MS);
    await caller.saved.sync();
    expect((await env.db.select().from(postState)).every((row) => !row.saved)).toBe(true);
  });

  it("rejects anonymous callers", async () => {
    const env = await createTestEnv();
    const caller = createCaller({ ...env.context, getSession: async () => null });
    await expect(caller.saved.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
