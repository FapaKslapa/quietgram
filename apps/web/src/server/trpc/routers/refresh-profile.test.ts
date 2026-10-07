import { following, syncState } from "@nodistraction/db";
import { describe, expect, it } from "vitest";
import { createCaller, world } from "@/test/engine-world";
import { createTestEnv, EngineFailure } from "@/test/helpers";

describe("fast profile", () => {
  it("offers the two minute cooldown and paces fast for credentials sessions", async () => {
    const env = await createTestEnv(undefined, { engine: world(), sessionSource: "credentials" });
    const caller = createCaller(env.context);
    await env.db.insert(syncState).values({ ownerId: "owner", lastRefreshAt: env.clock.current });
    const overview = await caller.refresh.overview();
    expect(overview).toMatchObject({ profile: "fast", backoffUntil: null });
    expect(overview.nextRefreshAt).toBe(env.clock.current.getTime() + 120_000);
    await caller.refresh.recheck();
    expect(env.engineCalls.some((call) => call.pacing === "fast")).toBe(true);
  });

  it("keeps extension sessions on the normal profile and headers", async () => {
    const env = await createTestEnv(undefined, { engine: world() });
    const caller = createCaller(env.context);
    expect(await caller.refresh.overview()).toMatchObject({ profile: "normal" });
    await caller.refresh.recheck();
    expect(env.engineCalls.every((call) => call.pacing === null)).toBe(true);
  });

  it("steps down for thirty minutes after a throttle and never retries", async () => {
    const env = await createTestEnv(undefined, {
      engine: world({
        fail: (call) =>
          call.path.endsWith("/posts") ? new EngineFailure(429, { code: "throttled" }) : undefined,
      }),
      sessionSource: "credentials",
    });
    await env.db.insert(following).values({ ownerId: "owner", igUserId: "5071", username: "a" });
    const caller = createCaller(env.context);
    const { runId } = await caller.refresh.start();
    const attempts: unknown[] = [];
    for (let index = 0; index < 6; index += 1) {
      attempts.push(await caller.refresh.step({ runId }).catch((error: unknown) => error));
    }
    expect(attempts.some((attempt) => attempt instanceof Error)).toBe(true);
    const overview = await caller.refresh.overview();
    expect(overview.profile).toBe("normal");
    expect(overview.backoffUntil).toBe(env.clock.current.getTime() + 30 * 60_000);
  });
});
