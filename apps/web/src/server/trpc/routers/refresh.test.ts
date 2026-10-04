import {
  following,
  igSessions,
  mutuals,
  posts,
  syncRuns,
  syncState,
  userSettings,
} from "@nodistraction/db";
import { IgHttpError, SessionExpiredError } from "@nodistraction/ig";
import timelineFixture from "@nodistraction/ig/fixtures/timeline.json" with { type: "json" };
import userInfoFixture from "@nodistraction/ig/fixtures/user-info.json" with { type: "json" };
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createCallerFactory } from "@/server/trpc/init";
import { appRouter } from "@/server/trpc/routers/_app";
import { createTestEnv, type RecordedCall } from "@/test/helpers";

const createCaller = createCallerFactory(appRouter);

const user = (pk: string) => ({ pk, username: `user_${pk}`, profile_pic_url: null });

type World = {
  following?: string[];
  followers?: string[];
  timeline?: unknown;
  info?: (call: RecordedCall) => unknown;
};

const world =
  (config: World = {}) =>
  (call: RecordedCall): unknown => {
    if (call.path.endsWith("/following/")) {
      return { users: (config.following ?? ["5071", "5008", "6000"]).map(user), next_max_id: null };
    }
    if (call.path.endsWith("/followers/")) {
      return { users: (config.followers ?? ["5071"]).map(user), next_max_id: null };
    }
    if (call.path === "/api/v1/feed/timeline/") return config.timeline ?? timelineFixture;
    if (call.path.includes("/info/")) return (config.info ?? (() => userInfoFixture))(call);
    throw new Error(`unexpected ${call.path}`);
  };

const runToEnd = async (caller: ReturnType<typeof createCaller>) => {
  const { runId } = await caller.refresh.start();
  let progress = await caller.refresh.step({ runId });
  while (!progress.done) progress = await caller.refresh.step({ runId });
  return { runId, progress };
};

const count = (calls: RecordedCall[], fragment: string) =>
  calls.filter((call) => call.path.includes(fragment)).length;

describe("refresh.start", () => {
  it("starts when there is no previous refresh and reports total steps", async () => {
    const env = await createTestEnv(world());
    const result = await createCaller(env.context).refresh.start();
    expect(result.runId).toMatch(/^[0-9a-f-]{36}$/);
    expect(result.total).toBe(7);
    const [run] = await env.db.select().from(syncRuns);
    expect(run).toMatchObject({ status: "running", completed: 0, kind: "refresh" });
  });

  it("rejects inside the cooldown with retryAfterSeconds and no instagram call", async () => {
    const env = await createTestEnv(world());
    const caller = createCaller(env.context);
    await caller.refresh.start();
    env.clock.current = new Date(env.clock.current.getTime() + 120_000);
    const failure = await caller.refresh.start().catch((error: unknown) => error);
    expect(failure).toMatchObject({
      code: "TOO_MANY_REQUESTS",
      cause: { retryAfterSeconds: 180 },
    });
    expect(env.calls).toEqual([]);
  });

  it("starts again once the cooldown has passed", async () => {
    const env = await createTestEnv(world());
    const caller = createCaller(env.context);
    await caller.refresh.start();
    env.clock.current = new Date(env.clock.current.getTime() + 300_000);
    await expect(caller.refresh.start()).resolves.toMatchObject({ total: 7 });
  });

  it("fails without a paired session", async () => {
    const env = await createTestEnv(world(), { withSession: false });
    await expect(createCaller(env.context).refresh.start()).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    });
  });

  it("rejects an expired session before using the cooldown", async () => {
    const env = await createTestEnv(world());
    await env.db.update(igSessions).set({ status: "expired" });
    const caller = createCaller(env.context);
    await expect(caller.refresh.start()).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(await env.db.select().from(syncState)).toEqual([]);
  });
});

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
    env.clock.current = new Date(env.clock.current.getTime() + 600_000);
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
    env.clock.current = new Date(env.clock.current.getTime() + 600_000);
    await runToEnd(caller);
    expect(count(env.calls, "/feed/timeline/") - before).toBe(1);
  });

  it("walks at most five timeline pages", async () => {
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
    expect(page).toBe(5);
    expect(await env.db.select().from(posts)).toHaveLength(5);
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
    env.clock.current = new Date(env.clock.current.getTime() + 600_000);
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

describe("follower counts", () => {
  it("fetches a few counts per refresh in creators mode and not again within a week", async () => {
    const env = await createTestEnv(world());
    await env.db.insert(userSettings).values({ ownerId: "owner", feedMode: "creators" });
    const caller = createCaller(env.context);
    await runToEnd(caller);
    const rows = await env.db.select().from(following);
    expect(rows.filter((row) => row.followerCount === 12345)).toHaveLength(3);
    expect(rows.every((row) => row.isBusiness)).toBe(true);
    expect(count(env.calls, "/info/")).toBe(3);
    expect(env.delays.count).toBe(2);
    env.clock.current = new Date(env.clock.current.getTime() + 600_000);
    await runToEnd(caller);
    expect(count(env.calls, "/info/")).toBe(3);
  });

  it("does not request counts in other modes", async () => {
    const env = await createTestEnv(world());
    await runToEnd(createCaller(env.context));
    expect(count(env.calls, "/info/")).toBe(0);
  });

  it("stops quietly on a rate limit without failing the refresh", async () => {
    const env = await createTestEnv(
      world({
        info: () => {
          throw new IgHttpError(429);
        },
      }),
    );
    await env.db.insert(userSettings).values({ ownerId: "owner", feedMode: "creators" });
    const { progress } = await runToEnd(createCaller(env.context));
    expect(progress.status).toBe("done");
    expect(count(env.calls, "/info/")).toBe(1);
    const [session] = await env.db.select().from(igSessions).where(eq(igSessions.ownerId, "owner"));
    expect(session?.status).toBe("active");
  });
});
