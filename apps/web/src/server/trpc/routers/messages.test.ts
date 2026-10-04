import { IgHttpError } from "@nodistraction/ig";
import inboxFixture from "@nodistraction/ig/fixtures/inbox.json" with { type: "json" };
import threadFixture from "@nodistraction/ig/fixtures/thread.json" with { type: "json" };
import { describe, expect, it } from "vitest";
import { createCallerFactory } from "@/server/trpc/init";
import { appRouter } from "@/server/trpc/routers/_app";
import { createTestEnv, type RecordedCall } from "@/test/helpers";

const createCaller = createCallerFactory(appRouter);

const respond = (call: RecordedCall): unknown => {
  if (call.path === "/api/v1/direct_v2/inbox/") return inboxFixture;
  if (call.path.startsWith("/api/v1/direct_v2/threads/") && call.method === "get") {
    return threadFixture;
  }
  if (call.path === "/api/v1/direct_v2/threads/broadcast/text/") return { status: "ok" };
  throw new Error(`unexpected ${call.path}`);
};

describe("messages router", () => {
  it("syncs the inbox and lists threads by recent activity", async () => {
    const env = await createTestEnv(respond);
    const caller = createCaller(env.context);
    await caller.messages.syncInbox();
    const threads = await caller.messages.threads();
    expect(threads.length).toBe(inboxFixture.inbox.threads.length);
    expect(threads[0]?.title).toBeTypeOf("string");
    const activity = threads.map((thread) => thread.lastActivityAt);
    expect(activity).toEqual([...activity].sort((a, b) => b - a));
  });

  it("syncs a thread then returns its messages in order", async () => {
    const env = await createTestEnv(respond);
    const caller = createCaller(env.context);
    const messages = await caller.messages.thread({ threadId: "7127" });
    expect(messages.length).toBe(threadFixture.thread.items.length);
    const times = messages.map((message) => message.sentAt);
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(env.calls.map((call) => call.path)).toEqual(["/api/v1/direct_v2/threads/7127/"]);
  });

  it("previews the latest stored message of a thread once it is synced", async () => {
    const env = await createTestEnv(respond);
    const caller = createCaller(env.context);
    await caller.messages.syncInbox();
    const [first] = await caller.messages.threads();
    expect(first?.preview).toBeNull();
    const messages = await caller.messages.thread({ threadId: first?.id ?? "" });
    const after = (await caller.messages.threads()).find((item) => item.id === first?.id);
    expect(after?.preview).toBe(messages.at(-1)?.text);
  });

  it("rejects empty text before any network call", async () => {
    const env = await createTestEnv(respond);
    const caller = createCaller(env.context);
    await expect(caller.messages.send({ threadId: "7127", text: "   " })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(env.calls).toEqual([]);
  });

  it("rejects text over the limit before any network call", async () => {
    const env = await createTestEnv(respond);
    const caller = createCaller(env.context);
    await expect(
      caller.messages.send({ threadId: "7127", text: "x".repeat(1001) }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(env.calls).toEqual([]);
  });

  it("rejects a malformed thread id before any network call", async () => {
    const env = await createTestEnv(respond);
    const caller = createCaller(env.context);
    await expect(caller.messages.send({ threadId: "../x", text: "hi" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(env.calls).toEqual([]);
  });

  it("sends and stores the message locally, replaced on the next thread sync", async () => {
    const env = await createTestEnv(respond);
    const caller = createCaller(env.context);
    await caller.messages.syncInbox();
    const sent = await caller.messages.send({ threadId: "7127", text: "  hello  " });
    expect(sent).toMatchObject({ text: "hello", senderId: "1000" });
    expect(env.calls.at(-1)).toMatchObject({ method: "postForm" });
    const synced = await caller.messages.thread({ threadId: "7127" });
    expect(synced.some((message) => message.id === sent.id)).toBe(false);
    expect(synced.length).toBe(threadFixture.thread.items.length);
  });

  it("surfaces a clear error and stores nothing when sending fails", async () => {
    const env = await createTestEnv((call) => {
      if (call.method === "postForm") throw new IgHttpError(400);
      return respond(call);
    });
    const caller = createCaller(env.context);
    await expect(caller.messages.send({ threadId: "7127", text: "hello" })).rejects.toMatchObject({
      code: "BAD_GATEWAY",
      message: "Message could not be sent",
    });
    expect(await caller.messages.thread({ threadId: "7127" })).toHaveLength(
      threadFixture.thread.items.length,
    );
  });
});
