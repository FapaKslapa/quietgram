import { IgHttpError, SessionExpiredError } from "@nodistraction/ig";
import { describe, expect, it } from "vitest";
import { createTestEnv } from "@/test/helpers";
import { createCaller, respond } from "@/test/messages-world";

describe("messages cooldown", () => {
  it("does not call Instagram again for the same inbox or thread within 60 seconds", async () => {
    const env = await createTestEnv(respond);
    const caller = createCaller(env.context);
    await caller.messages.syncInbox();
    await caller.messages.syncInbox();
    await caller.messages.thread({ threadId: "7127" });
    await caller.messages.thread({ threadId: "7127" });
    expect(env.calls.map((call) => call.path)).toEqual([
      "/api/v1/direct_v2/inbox/",
      "/api/v1/direct_v2/threads/7127/",
    ]);
  });

  it("syncs a different thread right away and each view again after 60 seconds", async () => {
    const env = await createTestEnv(respond);
    const caller = createCaller(env.context);
    await caller.messages.thread({ threadId: "7127" });
    await caller.messages.thread({ threadId: "8000" });
    env.clock.current = new Date(env.clock.current.getTime() + 61_000);
    await caller.messages.thread({ threadId: "7127" });
    expect(env.calls).toHaveLength(3);
  });

  it("does not start the window when the sync fails", async () => {
    let failing = true;
    const env = await createTestEnv((call) => {
      if (failing) throw new IgHttpError(500);
      return respond(call);
    });
    const caller = createCaller(env.context);
    await expect(caller.messages.syncInbox()).rejects.toBeDefined();
    failing = false;
    await caller.messages.syncInbox();
    expect(await caller.messages.threads()).not.toHaveLength(0);
  });
});

describe("messages thread resilience", () => {
  it("returns stored messages flagged stale when the fetch fails", async () => {
    let failing = false;
    const env = await createTestEnv(
      (call) => {
        if (failing) throw new IgHttpError(502);
        return respond(call);
      },
      { dmSendEnabled: true },
    );
    const caller = createCaller(env.context);
    const fresh = await caller.messages.thread({ threadId: "7127" });
    expect(fresh.stale).toBe(false);
    failing = true;
    env.clock.current = new Date(env.clock.current.getTime() + 61_000);
    const stale = await caller.messages.thread({ threadId: "7127" });
    expect(stale.stale).toBe(true);
    expect(stale.messages).toEqual(fresh.messages);
  });

  it("still fails with a short reason when nothing is stored", async () => {
    const env = await createTestEnv(() => {
      throw new IgHttpError(502);
    });
    await expect(
      createCaller(env.context).messages.thread({ threadId: "7127" }),
    ).rejects.toMatchObject({
      code: "BAD_GATEWAY",
      message: "Non riesco a leggere i messaggi: Instagram ha risposto 502",
    });
  });

  it("keeps expiry errors as errors", async () => {
    const env = await createTestEnv(() => {
      throw new SessionExpiredError();
    });
    await expect(
      createCaller(env.context).messages.thread({ threadId: "7127" }),
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  });
});
