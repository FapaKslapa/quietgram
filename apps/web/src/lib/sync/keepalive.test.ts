import { igSessions, syncRuns, syncState } from "@nodistraction/db";
import { IgHttpError, IgThrottledError, SessionExpiredError } from "@nodistraction/ig";
import currentUserFixture from "@nodistraction/ig/fixtures/current-user.json" with { type: "json" };
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { runKeepAlive } from "@/lib/sync/keepalive";
import { createTestEnv, seedOwner, seedSession } from "@/test/helpers";

describe("runKeepAlive", () => {
  it("keeps an active session active and logs a done run", async () => {
    const env = await createTestEnv(() => currentUserFixture);
    await runKeepAlive(env.deps);
    expect(env.calls).toEqual([
      { method: "get", path: "/api/v1/accounts/current_user/", params: { edit: "true" } },
    ]);
    const [session] = await env.db.select().from(igSessions);
    expect(session?.status).toBe("active");
    const [run] = await env.db.select().from(syncRuns);
    expect(run).toMatchObject({
      ownerId: "owner",
      kind: "keepalive",
      status: "done",
      total: 1,
      completed: 1,
    });
    expect(run?.finishedAt).toEqual(env.clock.current);
  });

  it("flips an expired session and logs a failed run", async () => {
    const env = await createTestEnv(() => {
      throw new SessionExpiredError();
    });
    await runKeepAlive(env.deps);
    const [session] = await env.db.select().from(igSessions);
    expect(session?.status).toBe("expired");
    const [run] = await env.db.select().from(syncRuns);
    expect(run).toMatchObject({ kind: "keepalive", status: "failed", completed: 0 });
  });

  it("keeps the session active on a transient instagram error", async () => {
    const env = await createTestEnv(() => {
      throw new IgHttpError(500);
    });
    await runKeepAlive(env.deps);
    const [session] = await env.db.select().from(igSessions);
    expect(session?.status).toBe("active");
    const [run] = await env.db.select().from(syncRuns);
    expect(run?.status).toBe("failed");
  });

  it("skips sessions that are already expired", async () => {
    const env = await createTestEnv(() => currentUserFixture, { withSession: false });
    await seedSession(env.db, "owner", "expired");
    await runKeepAlive(env.deps);
    expect(env.calls).toEqual([]);
    expect(await env.db.select().from(syncRuns)).toEqual([]);
  });

  it("checks every active session even when one fails", async () => {
    let call = 0;
    const env = await createTestEnv(() => {
      call += 1;
      if (call === 1) throw new SessionExpiredError();
      return currentUserFixture;
    });
    await seedOwner(env.db, "second");
    await seedSession(env.db, "second");
    await runKeepAlive(env.deps);
    const sessions = await env.db.select().from(igSessions);
    expect(sessions.map((session) => session.status).sort()).toEqual(["active", "expired"]);
    const runs = await env.db.select().from(syncRuns).where(eq(syncRuns.kind, "keepalive"));
    expect(runs.map((run) => run.status).sort()).toEqual(["done", "failed"]);
  });

  it("keeps the session active and records the wait when instagram throttles", async () => {
    const env = await createTestEnv(() => {
      throw new IgThrottledError();
    });
    await runKeepAlive(env.deps);
    const [session] = await env.db.select().from(igSessions);
    expect(session?.status).toBe("active");
    const [run] = await env.db.select().from(syncRuns);
    expect(run?.status).toBe("failed");
    const [state] = await env.db.select().from(syncState);
    expect(state?.lastRefreshAt?.getTime()).toBe(env.clock.current.getTime() + 15 * 60_000);
  });
});
