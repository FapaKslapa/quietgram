import { igSessions, syncState } from "@nodistraction/db";
import {
  IgHttpError,
  IgRejectedError,
  IgThrottledError,
  SessionExpiredError,
} from "@nodistraction/ig";
import inboxFixture from "@nodistraction/ig/fixtures/inbox.json" with { type: "json" };
import threadFixture from "@nodistraction/ig/fixtures/thread.json" with { type: "json" };
import { describe, expect, it } from "vitest";
import { createTestEnv } from "@/test/helpers";
import { createCaller, respond } from "@/test/messages-world";

describe("messages router", () => {
  it("syncs the inbox and lists threads by recent activity", async () => {
    const env = await createTestEnv(respond, { dmSendEnabled: true });
    const caller = createCaller(env.context);
    await caller.messages.syncInbox();
    const threads = await caller.messages.threads();
    expect(threads.length).toBe(inboxFixture.inbox.threads.length);
    expect(threads[0]?.title).toBeTypeOf("string");
    const activity = threads.map((thread) => thread.lastActivityAt);
    expect(activity).toEqual([...activity].sort((a, b) => b - a));
  });

  it("syncs a thread then returns its messages in order", async () => {
    const env = await createTestEnv(respond, { dmSendEnabled: true });
    const caller = createCaller(env.context);
    const messages = (await caller.messages.thread({ threadId: "7127" })).messages;
    expect(messages.length).toBe(threadFixture.thread.items.length);
    const times = messages.map((message) => message.sentAt);
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(env.calls.map((call) => call.path)).toEqual(["/api/v1/direct_v2/threads/7127/"]);
  });

  it("previews the latest stored message of a thread once it is synced", async () => {
    const env = await createTestEnv(respond, { dmSendEnabled: true });
    const caller = createCaller(env.context);
    await caller.messages.syncInbox();
    const [first] = await caller.messages.threads();
    expect(first?.preview).toBeNull();
    const messages = (await caller.messages.thread({ threadId: first?.id ?? "" })).messages;
    const after = (await caller.messages.threads()).find((item) => item.id === first?.id);
    expect(after?.preview).toBe(messages.at(-1)?.text);
  });

  it("rejects empty text before any network call", async () => {
    const env = await createTestEnv(respond, { dmSendEnabled: true });
    const caller = createCaller(env.context);
    await expect(caller.messages.send({ threadId: "7127", text: "   " })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(env.calls).toEqual([]);
  });

  it("rejects text over the limit before any network call", async () => {
    const env = await createTestEnv(respond, { dmSendEnabled: true });
    const caller = createCaller(env.context);
    await expect(
      caller.messages.send({ threadId: "7127", text: "x".repeat(1001) }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(env.calls).toEqual([]);
  });

  it("rejects a malformed thread id before any network call", async () => {
    const env = await createTestEnv(respond, { dmSendEnabled: true });
    const caller = createCaller(env.context);
    await expect(caller.messages.send({ threadId: "../x", text: "hi" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(env.calls).toEqual([]);
  });

  it("sends and stores the message locally, replaced on the next thread sync", async () => {
    const env = await createTestEnv(respond, { dmSendEnabled: true });
    const caller = createCaller(env.context);
    await caller.messages.syncInbox();
    const sent = await caller.messages.send({ threadId: "7127", text: "  hello  " });
    expect(sent).toMatchObject({ text: "hello", senderId: "1000" });
    expect(env.calls.at(-1)).toMatchObject({ method: "postForm" });
    const synced = (await caller.messages.thread({ threadId: "7127" })).messages;
    expect(synced.some((message) => message.id === sent.id)).toBe(false);
    expect(synced.length).toBe(threadFixture.thread.items.length);
  });

  it("surfaces a clear error and stores nothing when sending fails", async () => {
    const env = await createTestEnv(
      (call) => {
        if (call.method === "postForm") throw new IgHttpError(400);
        return respond(call);
      },
      { dmSendEnabled: true },
    );
    const caller = createCaller(env.context);
    await expect(caller.messages.send({ threadId: "7127", text: "hello" })).rejects.toMatchObject({
      code: "BAD_GATEWAY",
      message: "Message could not be sent",
    });
    expect((await caller.messages.thread({ threadId: "7127" })).messages).toHaveLength(
      threadFixture.thread.items.length,
    );
  });

  it("reports a rejected write with the reason and keeps the session active", async () => {
    const env = await createTestEnv(
      (call) => {
        if (call.method === "postForm") throw new IgRejectedError(403, "feedback_required", true);
        return respond(call);
      },
      { dmSendEnabled: true },
    );
    const caller = createCaller(env.context);
    await expect(caller.messages.send({ threadId: "7127", text: "hello" })).rejects.toMatchObject({
      code: "BAD_GATEWAY",
      message: "Instagram ha rifiutato il messaggio: feedback_required",
    });
    const [session] = await env.db.select().from(igSessions);
    expect(session?.status).toBe("active");
    expect((await caller.messages.thread({ threadId: "7127" })).messages).toHaveLength(
      threadFixture.thread.items.length,
    );
  });

  it("reports a rejected write without a reason", async () => {
    const env = await createTestEnv(
      (call) => {
        if (call.method === "postForm") throw new IgRejectedError(403, null, false);
        return respond(call);
      },
      { dmSendEnabled: true },
    );
    await expect(
      createCaller(env.context).messages.send({ threadId: "7127", text: "hello" }),
    ).rejects.toMatchObject({
      code: "BAD_GATEWAY",
      message: "Instagram ha rifiutato il messaggio.",
    });
  });

  it("marks the session expired on a true login_required", async () => {
    const env = await createTestEnv(
      (call) => {
        if (call.method === "postForm") throw new SessionExpiredError();
        return respond(call);
      },
      { dmSendEnabled: true },
    );
    await expect(
      createCaller(env.context).messages.send({ threadId: "7127", text: "hello" }),
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    const [session] = await env.db.select().from(igSessions);
    expect(session?.status).toBe("expired");
  });

  it("keeps the session active and sets a retry time when instagram throttles", async () => {
    const env = await createTestEnv(
      (call) => {
        if (call.method === "postForm") throw new IgThrottledError();
        return respond(call);
      },
      { dmSendEnabled: true },
    );
    const caller = createCaller(env.context);
    await expect(caller.messages.send({ threadId: "7127", text: "hello" })).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
      message: "Instagram ti chiede di aspettare qualche minuto. Riprova tra un po'.",
    });
    const [session] = await env.db.select().from(igSessions);
    expect(session?.status).toBe("active");
    const [state] = await env.db.select().from(syncState);
    expect(state).toBeDefined();
    const overview = await caller.refresh.overview();
    expect(overview.nextRefreshAt).toBe(env.clock.current.getTime() + 30 * 60_000);
    expect(overview.lastRefreshAt).toBe(env.clock.current.getTime());
  });
});
