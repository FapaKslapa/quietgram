import { following, posts, syncRuns, syncState } from "@nodistraction/db";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createCallerFactory } from "@/server/trpc/init";
import { appRouter } from "@/server/trpc/routers/_app";
import { createTestEnv, type EngineCall, EngineFailure } from "@/test/helpers";

const createCaller = createCallerFactory(appRouter);

const engineUser = (id: string) => ({
  id,
  username: `user_${id}`,
  avatar_url: null,
  is_verified: false,
  is_business: false,
  follower_count: null,
});

const NOW = Date.parse("2026-10-04T12:00:00Z");
const DAY = 86_400_000;
const RECENT = NOW - DAY;

const enginePost = (id: string, authorId: string, productType = "feed", takenAtMs = RECENT) => ({
  id,
  author_id: authorId,
  author_username: `user_${authorId}`,
  caption: null,
  taken_at_ms: takenAtMs,
  product_type: productType,
  media: [{ kind: "image", url: `https://cdn/${id}.jpg`, width: 10, height: 10 }],
});

type World = {
  following?: string[];
  followers?: string[];
  active?: boolean;
  postsFor?: (authorId: string) => unknown[];
  fail?: (call: EngineCall) => unknown;
};

const world = (config: World = {}) => {
  let active = config.active ?? true;
  return (call: EngineCall): unknown => {
    if (call.method === "PUT") active = true;
    const failure = config.fail?.(call);
    if (failure !== undefined) return failure;
    if (call.path === "/v1/session") return { active, username: "me" };
    if (call.path === "/v1/following") {
      return { users: (config.following ?? ["5071", "5008", "6000"]).map(engineUser) };
    }
    if (call.path === "/v1/followers") {
      return { users: (config.followers ?? ["5071"]).map(engineUser) };
    }
    const match = /^\/v1\/users\/(\d+)\/posts$/.exec(call.path);
    if (match?.[1]) {
      const authorId = match[1];
      return {
        posts: (
          config.postsFor ??
          ((id) => [enginePost(`p-${id}`, id), enginePost(`r-${id}`, id, "clips")])
        )(authorId),
      };
    }
    throw new Error(`unexpected ${call.method} ${call.path}`);
  };
};

const runToEnd = async (caller: ReturnType<typeof createCaller>) => {
  const { runId } = await caller.refresh.start();
  let progress = await caller.refresh.step({ runId });
  while (!progress.done) progress = await caller.refresh.step({ runId });
  return { runId, progress };
};

const postCalls = (calls: EngineCall[]) => calls.filter((call) => call.path.endsWith("/posts"));

describe("refresh with the engine", () => {
  it("walks the graph then fetches recent posts per allowed author without sleeping", async () => {
    const env = await createTestEnv(undefined, { engine: world() });
    const { progress } = await runToEnd(createCaller(env.context));
    expect(progress).toMatchObject({ status: "done", done: true });
    expect(env.calls).toEqual([]);
    expect(env.delays.count).toBe(0);
    expect(postCalls(env.engineCalls).map((call) => [call.path, call.query])).toEqual([
      ["/v1/users/5071/posts", { amount: "3" }],
    ]);
    const stored = await env.db.select().from(posts);
    expect(stored.map((post) => post.id)).toEqual(["p-5071"]);
    const rows = await env.db.select().from(following);
    expect(rows.map((row) => [row.igUserId, row.postsCheckedAt?.getTime() ?? null]).sort()).toEqual(
      [
        ["5008", null],
        ["5071", env.clock.current.getTime()],
        ["6000", null],
      ],
    );
  });

  it("checks at most six authors per step and the oldest checked first on the next run", async () => {
    const ids = ["1", "2", "3", "4", "5", "6", "7", "8"];
    const env = await createTestEnv(undefined, {
      engine: world({ following: ids, followers: ids }),
    });
    const caller = createCaller(env.context);
    const { runId } = await caller.refresh.start();
    const steps: number[] = [];
    let progress = await caller.refresh.step({ runId });
    steps.push(postCalls(env.engineCalls).length);
    while (!progress.done) {
      progress = await caller.refresh.step({ runId });
      steps.push(postCalls(env.engineCalls).length);
    }
    expect(steps).toEqual([0, 0, 6, 8]);
    expect(progress.total).toBe(progress.completed);

    env.clock.current = new Date(env.clock.current.getTime() + 3_600_000);
    await env.db
      .update(following)
      .set({ postsCheckedAt: new Date("2026-10-01T00:00:00Z") })
      .where(eq(following.igUserId, "8"));
    const before = postCalls(env.engineCalls).length;
    await env.db.update(syncState).set({
      lastRefreshAt: new Date(0),
      mutualsRefreshedAt: env.clock.current,
    });
    await runToEnd(caller);
    const second = postCalls(env.engineCalls).slice(before);
    expect(second[0]?.path).toBe("/v1/users/8/posts");
  });

  it("hands the session over once when the engine has none", async () => {
    const env = await createTestEnv(undefined, { engine: world({ active: false }) });
    await runToEnd(createCaller(env.context));
    const handovers = env.engineCalls.filter((call) => call.method === "PUT");
    expect(handovers).toHaveLength(1);
    expect(handovers[0]).toMatchObject({ path: "/v1/session", body: '{"sessionid":"s"}' });
    expect(env.engineCalls.every((call) => call.accountId === "1000")).toBe(true);
  });

  it("does not hand the session over when the engine already has it", async () => {
    const env = await createTestEnv(undefined, { engine: world() });
    await runToEnd(createCaller(env.context));
    expect(env.engineCalls.some((call) => call.method === "PUT")).toBe(false);
  });

  it("fails the run and records the wait when the engine is throttled", async () => {
    const env = await createTestEnv(undefined, {
      engine: world({
        fail: (call) =>
          call.path === "/v1/following"
            ? new EngineFailure(429, { code: "throttled", retry_after_seconds: 1800 })
            : undefined,
      }),
    });
    const caller = createCaller(env.context);
    const { runId } = await caller.refresh.start();
    await expect(caller.refresh.step({ runId })).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
    });
    const [run] = await env.db.select().from(syncRuns).where(eq(syncRuns.id, runId));
    expect(run?.status).toBe("failed");
  });

  it("marks the session expired when the engine reports session_expired", async () => {
    const env = await createTestEnv(undefined, {
      engine: world({
        fail: (call) =>
          call.path === "/v1/following"
            ? new EngineFailure(401, { code: "session_expired" })
            : undefined,
      }),
    });
    const caller = createCaller(env.context);
    const { runId } = await caller.refresh.start();
    await expect(caller.refresh.step({ runId })).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    });
    expect((await caller.refresh.overview()).sessionStatus).toBe("expired");
  });

  it("reports an unreachable engine as a bad gateway", async () => {
    const env = await createTestEnv(undefined, {
      engine: world({ fail: () => new TypeError("fetch failed") }),
    });
    const caller = createCaller(env.context);
    const { runId } = await caller.refresh.start();
    await expect(caller.refresh.step({ runId })).rejects.toMatchObject({ code: "BAD_GATEWAY" });
  });

  it("never stores posts older than the window and records the last post time", async () => {
    const env = await createTestEnv(undefined, {
      engine: world({
        following: ["5071"],
        postsFor: (id) => [
          enginePost("fresh", id, "feed", NOW - 2 * DAY),
          enginePost("stale", id, "feed", NOW - 20 * DAY),
        ],
      }),
    });
    await runToEnd(createCaller(env.context));
    expect((await env.db.select().from(posts)).map((post) => post.id)).toEqual(["fresh"]);
    const [row] = await env.db.select().from(following).where(eq(following.igUserId, "5071"));
    expect(row?.lastPostAt?.getTime()).toBe(NOW - 2 * DAY);
  });

  it("marks a dormant author as checked without storing anything", async () => {
    const env = await createTestEnv(undefined, {
      engine: world({
        following: ["5071"],
        postsFor: (id) => [enginePost("june", id, "feed", NOW - 120 * DAY)],
      }),
    });
    await runToEnd(createCaller(env.context));
    expect(await env.db.select().from(posts)).toEqual([]);
    const [row] = await env.db.select().from(following).where(eq(following.igUserId, "5071"));
    expect(row?.postsCheckedAt?.getTime()).toBe(NOW);
    expect(row?.lastPostAt?.getTime()).toBe(NOW - 120 * DAY);
  });

  it("checks active authors first and dormant ones at most weekly", async () => {
    const env = await createTestEnv(undefined, {
      engine: world({ following: ["1", "2", "3"], followers: ["1", "2", "3"] }),
    });
    const caller = createCaller(env.context);
    await runToEnd(caller);
    const checked = new Date(NOW - 3_600_000);
    const setAuthor = (id: string, postsCheckedAt: Date, lastPostAt: Date) =>
      env.db
        .update(following)
        .set({ postsCheckedAt, lastPostAt })
        .where(eq(following.igUserId, id));
    await setAuthor("1", new Date(NOW - 40 * DAY), new Date(NOW - 90 * DAY));
    await setAuthor("2", checked, new Date(NOW - 2 * DAY));
    await setAuthor("3", new Date(NOW - 8 * DAY), new Date(NOW - 90 * DAY));
    await env.db
      .update(syncState)
      .set({ lastRefreshAt: new Date(0), mutualsRefreshedAt: new Date(NOW) });
    env.clock.current = new Date(NOW + 2 * 3_600_000);
    const before = postCalls(env.engineCalls).length;
    await runToEnd(caller);
    expect(
      postCalls(env.engineCalls)
        .slice(before)
        .map((call) => call.path),
    ).toEqual(["/v1/users/2/posts", "/v1/users/1/posts", "/v1/users/3/posts"]);

    await setAuthor("1", new Date(NOW - 3 * DAY), new Date(NOW - 90 * DAY));
    await setAuthor("3", new Date(NOW - 3 * DAY), new Date(NOW - 90 * DAY));
    await env.db
      .update(syncState)
      .set({ lastRefreshAt: new Date(0), mutualsRefreshedAt: new Date(NOW) });
    env.clock.current = new Date(NOW + 4 * 3_600_000);
    const afterFirst = postCalls(env.engineCalls).length;
    await runToEnd(caller);
    expect(
      postCalls(env.engineCalls)
        .slice(afterFirst)
        .map((call) => call.path),
    ).toEqual(["/v1/users/2/posts"]);
  });

  it("deletes stored posts older than sixty days when the run finishes", async () => {
    const env = await createTestEnv(undefined, { engine: world({ following: ["5071"] }) });
    await env.db.insert(posts).values(
      [
        ["ancient", 61],
        ["edge", 59],
      ].map(([id, age]) => ({
        id: String(id),
        ownerId: "owner",
        authorId: "9",
        authorUsername: "nine",
        caption: null,
        takenAt: new Date(NOW - Number(age) * DAY),
        mediaJson: "[]",
      })),
    );
    await runToEnd(createCaller(env.context));
    expect((await env.db.select().from(posts)).map((post) => post.id).sort()).toEqual([
      "edge",
      "p-5071",
    ]);
  });
});
