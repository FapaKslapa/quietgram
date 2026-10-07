import { following, igSessions, userSettings } from "@nodistraction/db";
import { IgHttpError } from "@nodistraction/ig";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createTestEnv } from "@/test/helpers";
import { count, createCaller, runToEnd, world } from "@/test/refresh-world";

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
    env.clock.current = new Date(env.clock.current.getTime() + 960_000);
    await runToEnd(caller);
    expect(count(env.calls, "/info/")).toBe(3);
  });

  it("fetches at most three counts and in a step without other requests", async () => {
    const many = ["5001", "5002", "5003", "5004", "5005", "5006"];
    const env = await createTestEnv(world({ following: many, followers: many }));
    await env.db.insert(userSettings).values({ ownerId: "owner", feedMode: "creators" });
    const caller = createCaller(env.context);
    const { runId } = await caller.refresh.start();
    const stepPaths: string[][] = [];
    let done = false;
    while (!done) {
      const before = env.calls.length;
      done = (await caller.refresh.step({ runId })).done;
      stepPaths.push(env.calls.slice(before).map((call) => call.path));
    }
    expect(count(env.calls, "/info/")).toBe(3);
    const countSteps = stepPaths.filter((paths) => paths.some((path) => path.includes("/info/")));
    expect(countSteps).toHaveLength(1);
    expect(countSteps[0]?.every((path) => path.includes("/info/"))).toBe(true);
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
