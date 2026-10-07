import { following, igSessions, mutuals, posts } from "@nodistraction/db";
import { IgHttpError, SessionExpiredError } from "@nodistraction/ig";
import { describe, expect, it } from "vitest";
import { createTestEnv } from "@/test/helpers";
import { count, createCaller, runToEnd, world } from "@/test/refresh-world";

describe("refresh.step", () => {
  it("runs mutuals then timeline and stores posts of mutual authors only", async () => {
    const env = await createTestEnv(world());
    const caller = createCaller(env.context);
    const { runId, progress } = await runToEnd(caller);
    expect(progress).toMatchObject({ status: "done", done: true });
    expect(progress.completed).toBe(progress.total);
    expect((await env.db.select().from(mutuals)).map((row) => row.igUserId)).toEqual(["5071"]);
    expect((await env.db.select().from(following)).map((row) => row.igUserId).sort()).toEqual([
      "5008",
      "5071",
      "6000",
    ]);
    expect((await env.db.select().from(posts)).map((row) => row.id)).toEqual(["9064"]);
    expect(await caller.refresh.status({ runId })).toMatchObject({ status: "done" });
  });

  it("keeps every step within the instagram request budget", async () => {
    const env = await createTestEnv(world());
    const caller = createCaller(env.context);
    const { runId } = await caller.refresh.start();
    let done = false;
    while (!done) {
      const before = env.calls.length;
      done = (await caller.refresh.step({ runId })).done;
      expect(env.calls.length - before).toBeLessThanOrEqual(20);
    }
  });

  it("does not recompute mutuals within 24 hours", async () => {
    const env = await createTestEnv(world());
    const caller = createCaller(env.context);
    await runToEnd(caller);
    const friendshipCalls = count(env.calls, "/friendships/");
    env.clock.current = new Date(env.clock.current.getTime() + 960_000);
    await runToEnd(caller);
    expect(count(env.calls, "/friendships/")).toBe(friendshipCalls);
    env.clock.current = new Date(env.clock.current.getTime() + 25 * 3_600_000);
    await runToEnd(caller);
    expect(count(env.calls, "/friendships/")).toBe(friendshipCalls * 2);
  });

  it("stops early when it meets posts already stored", async () => {
    const env = await createTestEnv(world());
    const caller = createCaller(env.context);
    await runToEnd(caller);
    const before = count(env.calls, "/feed/timeline/");
    env.clock.current = new Date(env.clock.current.getTime() + 960_000);
    await runToEnd(caller);
    expect(count(env.calls, "/feed/timeline/") - before).toBe(1);
  });

  it("walks at most two timeline pages", async () => {
    let page = 0;
    const base = world();
    const env = await createTestEnv((call) => {
      if (call.path !== "/api/v1/feed/timeline/") return base(call);
      page += 1;
      return {
        feed_items: [
          {
            media_or_ad: {
              pk: `new-${page}`,
              product_type: "feed",
              taken_at: 1_790_000_000 + page,
              user: { pk: "5071", username: "user_5071" },
              caption: null,
              image_versions2: {
                candidates: [{ url: "https://example.invalid/i", width: 1, height: 1 }],
              },
            },
          },
        ],
        next_max_id: `cursor-${page}`,
      };
    });
    await runToEnd(createCaller(env.context));
    expect(page).toBe(2);
    expect(await env.db.select().from(posts)).toHaveLength(2);
  });

  it("does not store timeline posts older than the recency window", async () => {
    const env = await createTestEnv((call) => {
      if (call.path !== "/api/v1/feed/timeline/") return world()(call);
      return {
        feed_items: [
          ["old-post", 1_780_000_000],
          ["new-post", 1_790_000_000],
        ].map(([pk, takenAt]) => ({
          media_or_ad: {
            pk,
            product_type: "feed",
            taken_at: takenAt,
            user: { pk: "5071", username: "user_5071" },
            caption: null,
            image_versions2: {
              candidates: [{ url: "https://example.invalid/i", width: 1, height: 1 }],
            },
          },
        })),
        next_max_id: null,
      };
    });
    await runToEnd(createCaller(env.context));
    expect((await env.db.select().from(posts)).map((post) => post.id)).toEqual(["new-post"]);
  });

  it("gives an empty feed instead of an error when there are no mutuals", async () => {
    const env = await createTestEnv(world({ followers: [] }));
    const caller = createCaller(env.context);
    const { progress } = await runToEnd(caller);
    expect(progress.status).toBe("done");
    expect(await env.db.select().from(mutuals)).toEqual([]);
    expect(await env.db.select().from(posts)).toEqual([]);
    expect(count(env.calls, "/feed/timeline/")).toBe(0);
  });

  it("marks the session expired and fails the run on an expired session", async () => {
    const env = await createTestEnv(() => {
      throw new SessionExpiredError();
    });
    const caller = createCaller(env.context);
    const { runId } = await caller.refresh.start();
    const failure = await caller.refresh.step({ runId }).catch((error: unknown) => error);
    expect(failure).toMatchObject({
      code: "PRECONDITION_FAILED",
      cause: { name: "SessionExpiredError" },
    });
    const [session] = await env.db.select().from(igSessions);
    expect(session?.status).toBe("expired");
    expect(await caller.refresh.status({ runId })).toMatchObject({ status: "failed", done: true });
    const callsBefore = env.calls.length;
    env.clock.current = new Date(env.clock.current.getTime() + 960_000);
    await expect(caller.refresh.start()).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(env.calls.length).toBe(callsBefore);
  });

  it("fails the run with a bad gateway error on an instagram http error", async () => {
    const env = await createTestEnv(() => {
      throw new IgHttpError(500);
    });
    const caller = createCaller(env.context);
    const { runId } = await caller.refresh.start();
    await expect(caller.refresh.step({ runId })).rejects.toMatchObject({ code: "BAD_GATEWAY" });
    expect(await caller.refresh.status({ runId })).toMatchObject({ status: "failed" });
    const [session] = await env.db.select().from(igSessions);
    expect(session?.status).toBe("active");
  });

  it("returns not found for another owner's run", async () => {
    const env = await createTestEnv(world());
    const caller = createCaller(env.context);
    await expect(
      caller.refresh.step({ runId: "00000000-0000-4000-8000-000000000000" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
