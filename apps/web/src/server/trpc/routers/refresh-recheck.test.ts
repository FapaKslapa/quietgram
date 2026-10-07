import { igSessions } from "@nodistraction/db";
import { IgHttpError, SessionExpiredError } from "@nodistraction/ig";
import currentUserFixture from "@nodistraction/ig/fixtures/current-user.json" with { type: "json" };
import { describe, expect, it } from "vitest";
import { createTestEnv } from "@/test/helpers";
import { createCaller } from "@/test/refresh-world";

describe("refresh.recheck", () => {
  it("reactivates an expired session with the lightest call", async () => {
    const env = await createTestEnv(() => currentUserFixture);
    await env.db.update(igSessions).set({ status: "expired" });
    const caller = createCaller(env.context);
    await expect(caller.refresh.recheck()).resolves.toEqual({ sessionStatus: "active" });
    expect(env.calls).toEqual([
      { method: "get", path: "/api/v1/accounts/current_user/", params: { edit: "true" } },
    ]);
    expect((await caller.refresh.overview()).sessionStatus).toBe("active");
  });

  it("stays expired and fails when the session is truly expired", async () => {
    const env = await createTestEnv(() => {
      throw new SessionExpiredError();
    });
    await env.db.update(igSessions).set({ status: "expired" });
    const caller = createCaller(env.context);
    await expect(caller.refresh.recheck()).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect((await caller.refresh.overview()).sessionStatus).toBe("expired");
  });

  it("does not reactivate on a transient instagram error", async () => {
    const env = await createTestEnv(() => {
      throw new IgHttpError(500);
    });
    await env.db.update(igSessions).set({ status: "expired" });
    const caller = createCaller(env.context);
    await expect(caller.refresh.recheck()).rejects.toMatchObject({ code: "BAD_GATEWAY" });
    expect((await caller.refresh.overview()).sessionStatus).toBe("expired");
  });

  it("fails without a paired session", async () => {
    const env = await createTestEnv(undefined, { withSession: false });
    await expect(createCaller(env.context).refresh.recheck()).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    });
  });
});
