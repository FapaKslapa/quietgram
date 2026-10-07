import { syncRuns, syncState } from "@nodistraction/db";
import userInfoFixture from "@nodistraction/ig/fixtures/user-info.json" with { type: "json" };
import { eq, sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createCallerFactory } from "@/server/trpc/init";
import { appRouter } from "@/server/trpc/routers/_app";
import { createTestEnv, type RecordedCall } from "@/test/helpers";

const createCaller = createCallerFactory(appRouter);

const user = (pk: string) => ({ pk, username: `user_${pk}`, profile_pic_url: null });

const world = (call: RecordedCall): unknown => {
  if (call.path.endsWith("/following/")) return { users: [user("5071")], next_max_id: null };
  if (call.path.endsWith("/followers/")) return { users: [user("5071")], next_max_id: null };
  if (call.path.includes("/info/")) return userInfoFixture;
  throw new Error(`unexpected ${call.path}`);
};

describe("refresh claims", () => {
  it("lets exactly one of two parallel starts create a run", async () => {
    const env = await createTestEnv(world);
    const caller = createCaller(env.context);
    const results = await Promise.allSettled([caller.refresh.start(), caller.refresh.start()]);
    const runs = await env.db.select().from(syncRuns);
    expect(runs).toHaveLength(1);
    const fulfilled = results.filter((result) => result.status === "fulfilled");
    expect(fulfilled.length).toBeGreaterThanOrEqual(1);
    for (const result of results) {
      if (result.status === "rejected") {
        expect(result.reason).toMatchObject({ code: "TOO_MANY_REQUESTS" });
      } else {
        expect(result.value.runId).toBe(runs[0]?.id);
      }
    }
  });

  it("restores the cooldown marker when the run row cannot be stored", async () => {
    const env = await createTestEnv(world);
    await env.db.run(
      sql`create trigger fail_run before insert on sync_runs begin select raise(abort, 'boom'); end`,
    );
    await expect(createCaller(env.context).refresh.start()).rejects.toBeDefined();
    const [state] = await env.db.select().from(syncState).where(eq(syncState.ownerId, "owner"));
    expect(state?.lastRefreshAt ?? null).toBeNull();
  });

  it("runs a step only once when two arrive together", async () => {
    const env = await createTestEnv(world);
    const caller = createCaller(env.context);
    const { runId } = await caller.refresh.start();
    const [first, second] = await Promise.all([
      caller.refresh.step({ runId }),
      caller.refresh.step({ runId }),
    ]);
    const [run] = await env.db.select().from(syncRuns);
    expect(run?.completed).toBe(1);
    expect(Math.max(first.completed, second.completed)).toBe(1);
    expect(Math.min(first.completed, second.completed)).toBe(0);
    expect(run?.leaseUntil).toBeNull();
  });

  it("takes over a step whose lease expired", async () => {
    const env = await createTestEnv(world);
    const caller = createCaller(env.context);
    const { runId } = await caller.refresh.start();
    await env.db
      .update(syncRuns)
      .set({ leaseUntil: new Date(env.clock.current.getTime() + 30_000) });
    expect((await caller.refresh.step({ runId })).completed).toBe(0);
    env.clock.current = new Date(env.clock.current.getTime() + 61_000);
    expect((await caller.refresh.step({ runId })).completed).toBe(1);
  });
});
