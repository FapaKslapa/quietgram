import {
  following,
  igSessions,
  mutuals,
  syncRuns,
  syncState,
  userSettings,
} from "@nodistraction/db";
import { IgHttpError, IgThrottledError } from "@nodistraction/ig";
import { describe, expect, it } from "vitest";
import { createTestEnv } from "@/test/helpers";
import { count, createCaller, world } from "@/test/refresh-world";

describe("refresh throttling", () => {
  it.each([
    ["timeline", "/api/v1/feed/timeline/", "mutuals"],
    ["counts", "/info/", "creators"],
  ])(
    "stops the whole run without retry when the %s step is throttled",
    async (_name, fragment, mode) => {
      const base = world();
      const env = await createTestEnv((call) => {
        if (call.path.includes(fragment)) throw new IgThrottledError();
        return base(call);
      });
      if (mode === "creators") {
        await env.db.insert(userSettings).values({ ownerId: "owner", feedMode: "creators" });
      }
      await env.db.insert(following).values({ ownerId: "owner", igUserId: "5071", username: "a" });
      await env.db.insert(mutuals).values({ ownerId: "owner", igUserId: "5071", username: "a" });
      await env.db.insert(syncState).values({
        ownerId: "owner",
        mutualsRefreshedAt: new Date(env.clock.current.getTime() - 3_600_000),
      });
      const caller = createCaller(env.context);
      const { runId } = await caller.refresh.start();
      let failure: unknown = null;
      for (let index = 0; index < 6 && failure === null; index += 1) {
        failure = await caller.refresh.step({ runId }).then(
          () => null,
          (error: unknown) => error,
        );
      }
      expect(failure).toMatchObject({ code: "TOO_MANY_REQUESTS" });
      const callsBefore = env.calls.length;
      expect(await caller.refresh.step({ runId })).toMatchObject({ status: "failed", done: true });
      expect(env.calls.length).toBe(callsBefore);
      expect(count(env.calls, fragment)).toBe(1);
    },
  );

  it("stops the run cleanly, keeps the session active and delays the next refresh", async () => {
    const env = await createTestEnv((call) => {
      if (call.path.endsWith("/following/")) throw new IgThrottledError();
      return world()(call);
    });
    const caller = createCaller(env.context);
    const { runId } = await caller.refresh.start();
    await expect(caller.refresh.step({ runId })).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
      message: "Instagram ti chiede di aspettare qualche minuto. Riprova tra un po'.",
    });
    const [run] = await env.db.select().from(syncRuns);
    expect(run?.status).toBe("failed");
    const [session] = await env.db.select().from(igSessions);
    expect(session?.status).toBe("active");
    const overview = await caller.refresh.overview();
    expect(overview.nextRefreshAt).toBe(env.clock.current.getTime() + 30 * 60_000);
    const callsBefore = env.calls.length;
    await expect(caller.refresh.start()).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
      cause: { retryAfterSeconds: 1800 },
    });
    expect(env.calls.length).toBe(callsBefore);
  });
});

describe("refresh cooldown consumption", () => {
  it("restores the previous marker when the first step fails with a network error", async () => {
    const env = await createTestEnv(() => {
      throw new IgHttpError(500);
    });
    const previous = new Date("2026-10-04T11:00:00Z");
    await env.db.insert(syncState).values({ ownerId: "owner", lastRefreshAt: previous });
    const caller = createCaller(env.context);
    const { runId } = await caller.refresh.start();
    await expect(caller.refresh.step({ runId })).rejects.toBeDefined();
    const overview = await caller.refresh.overview();
    expect(overview.lastRefreshAt).toBe(previous.getTime());
    await expect(caller.refresh.start()).resolves.toMatchObject({ total: 4 });
  });

  it("clears the marker when a first-ever refresh fails before any step", async () => {
    const env = await createTestEnv(() => {
      throw new IgHttpError(500);
    });
    const caller = createCaller(env.context);
    const { runId } = await caller.refresh.start();
    await expect(caller.refresh.step({ runId })).rejects.toBeDefined();
    expect((await caller.refresh.overview()).nextRefreshAt).toBeNull();
  });

  it("keeps the cooldown once a step has completed", async () => {
    const env = await createTestEnv((call) => {
      if (call.path === "/api/v1/feed/timeline/") throw new IgHttpError(500);
      return world()(call);
    });
    const caller = createCaller(env.context);
    const { runId } = await caller.refresh.start();
    await caller.refresh.step({ runId });
    await caller.refresh.step({ runId });
    await expect(caller.refresh.step({ runId })).rejects.toBeDefined();
    const overview = await caller.refresh.overview();
    expect(overview.nextRefreshAt).toBe(env.clock.current.getTime() + 15 * 60_000);
  });

  it("does not undo the throttle penalty on a first-step throttle", async () => {
    const env = await createTestEnv(() => {
      throw new IgThrottledError();
    });
    const caller = createCaller(env.context);
    const { runId } = await caller.refresh.start();
    await expect(caller.refresh.step({ runId })).rejects.toBeDefined();
    expect((await caller.refresh.overview()).nextRefreshAt).toBe(
      env.clock.current.getTime() + 30 * 60_000,
    );
  });

  it("restores the marker when the session is expired at the first step", async () => {
    const env = await createTestEnv(world());
    const caller = createCaller(env.context);
    const { runId } = await caller.refresh.start();
    await env.db.update(igSessions).set({ status: "expired" });
    await expect(caller.refresh.step({ runId })).rejects.toBeDefined();
    expect((await caller.refresh.overview()).nextRefreshAt).toBeNull();
  });
});
