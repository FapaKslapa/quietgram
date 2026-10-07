import { following, igSessions, syncRuns, syncState } from "@nodistraction/db";
import { describe, expect, it } from "vitest";
import { createTestEnv, IG_USER_ID } from "@/test/helpers";
import { count, createCaller, world } from "@/test/refresh-world";

describe("refresh.overview", () => {
  it("reports no refresh yet for a fresh account", async () => {
    const env = await createTestEnv();
    expect(await createCaller(env.context).refresh.overview()).toEqual({
      sessionStatus: "active",
      viewerId: IG_USER_ID,
      lastRefreshAt: null,
      nextRefreshAt: null,
      profile: "normal",
      backoffUntil: null,
      dmSendEnabled: false,
      interactionsEnabled: false,
    });
  });

  it("reports the cooldown end after a refresh and the expired session", async () => {
    const env = await createTestEnv();
    await env.db
      .insert(syncState)
      .values({ ownerId: "owner", lastRefreshAt: new Date("2026-10-04T11:58:00Z") });
    await env.db.update(igSessions).set({ status: "expired" });
    expect(await createCaller(env.context).refresh.overview()).toEqual({
      sessionStatus: "expired",
      viewerId: IG_USER_ID,
      lastRefreshAt: new Date("2026-10-04T11:58:00Z").getTime(),
      nextRefreshAt: new Date("2026-10-04T12:13:00Z").getTime(),
      profile: "normal",
      backoffUntil: null,
      dmSendEnabled: false,
      interactionsEnabled: false,
    });
  });

  it("reports none without a paired session", async () => {
    const env = await createTestEnv(undefined, { withSession: false });
    expect((await createCaller(env.context).refresh.overview()).sessionStatus).toBe("none");
  });
});

describe("refresh.start", () => {
  it("starts when there is no previous refresh and reports total steps", async () => {
    const env = await createTestEnv(world());
    const result = await createCaller(env.context).refresh.start();
    expect(result.runId).toMatch(/^[0-9a-f-]{36}$/);
    expect(result.total).toBe(4);
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
      cause: { retryAfterSeconds: 780 },
    });
    expect(env.calls).toEqual([]);
  });

  it("starts again once the cooldown has passed", async () => {
    const env = await createTestEnv(world());
    const caller = createCaller(env.context);
    await caller.refresh.start();
    env.clock.current = new Date(env.clock.current.getTime() + 900_000);
    await expect(caller.refresh.start()).resolves.toMatchObject({ total: 4 });
  });

  it("skips the following list when mutuals and following are fresh", async () => {
    const env = await createTestEnv(world());
    await env.db.insert(following).values({ ownerId: "owner", igUserId: "5071", username: "a" });
    await env.db.insert(syncState).values({
      ownerId: "owner",
      mutualsRefreshedAt: new Date(env.clock.current.getTime() - 3_600_000),
    });
    const caller = createCaller(env.context);
    const { runId, total } = await caller.refresh.start();
    expect(total).toBe(2);
    await caller.refresh.step({ runId });
    expect(count(env.calls, "/friendships/")).toBe(0);
  });

  it("refreshes the following list when no following data is stored yet", async () => {
    const env = await createTestEnv(world());
    await env.db.insert(syncState).values({
      ownerId: "owner",
      mutualsRefreshedAt: new Date(env.clock.current.getTime() - 3_600_000),
    });
    const { total } = await createCaller(env.context).refresh.start();
    expect(total).toBe(4);
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

describe("refresh.start double click", () => {
  it("returns the running run when started less than two minutes ago", async () => {
    const env = await createTestEnv(world());
    const caller = createCaller(env.context);
    const first = await caller.refresh.start();
    env.clock.current = new Date(env.clock.current.getTime() + 90_000);
    await expect(caller.refresh.start()).resolves.toEqual(first);
    expect(await env.db.select().from(syncRuns)).toHaveLength(1);
  });

  it("falls back to the cooldown once the run is older than two minutes", async () => {
    const env = await createTestEnv(world());
    const caller = createCaller(env.context);
    await caller.refresh.start();
    env.clock.current = new Date(env.clock.current.getTime() + 121_000);
    await expect(caller.refresh.start()).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
  });
});
