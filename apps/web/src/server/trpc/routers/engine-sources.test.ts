import { igSessions, syncRuns } from "@nodistraction/db";
import { describe, expect, it } from "vitest";
import { runKeepAlive } from "@/lib/sync/keepalive";
import { createCallerFactory } from "@/server/trpc/init";
import { appRouter } from "@/server/trpc/routers/_app";
import { createTestEnv, type EngineCall, EngineFailure } from "@/test/helpers";

const createCaller = createCallerFactory(appRouter);

const enginePost = (id: string, productType = "feed") => ({
  id,
  code: `code-${id}`,
  author_id: "1",
  author_username: "ada",
  caption: "ciao",
  taken_at_ms: 5,
  product_type: productType,
  media: [{ kind: "image", url: "https://cdn/x.jpg", width: 1, height: 1 }],
});

const respond = (call: EngineCall): unknown => {
  if (call.path === "/v1/session") return { active: true, username: "me" };
  if (call.path === "/v1/saved") return { posts: [enginePost("s1"), enginePost("s2", "clips")] };
  if (call.path === "/v1/following") return { users: [] };
  if (call.path === "/v1/threads") {
    return {
      threads: [{ id: "77", title: "Ada", last_activity_at_ms: 9, unread: true, preview: null }],
    };
  }
  if (call.path === "/v1/threads/77" && call.method === "GET") {
    return {
      messages: [
        { id: "m1", sender_id: "1000", text: "ciao", sent_at_ms: 3 },
        { id: "m2", sender_id: null, text: null, sent_at_ms: 4 },
      ],
    };
  }
  if (call.path === "/v1/threads/77/messages") {
    return { id: "m3", sender_id: "1000", text: "yo", sent_at_ms: 5 };
  }
  throw new Error(`unexpected ${call.method} ${call.path}`);
};

describe("engine backed routers", () => {
  it("syncs saved posts", async () => {
    const env = await createTestEnv(undefined, { engine: respond, dmSendEnabled: true });
    const caller = createCaller(env.context);
    await caller.saved.sync();
    const saved = await caller.saved.list();
    expect(saved.map((post) => post.id)).toEqual(["s1", "s2"]);
    expect(saved.map((post) => [post.shortcode, post.productType])).toEqual([
      ["code-s1", "feed"],
      ["code-s2", "clips"],
    ]);
    expect(env.calls).toEqual([]);
  });

  it("syncs the inbox and a thread", async () => {
    const env = await createTestEnv(undefined, { engine: respond, dmSendEnabled: true });
    const caller = createCaller(env.context);
    await caller.messages.syncInbox();
    expect((await caller.messages.threads()).map((thread) => thread.id)).toEqual(["77"]);
    const messages = (await caller.messages.thread({ threadId: "77" })).messages;
    expect(messages.map((message) => [message.id, message.senderId])).toEqual([
      ["m1", "1000"],
      ["m2", ""],
    ]);
  });

  it("sends a message through the engine", async () => {
    const env = await createTestEnv(undefined, { engine: respond, dmSendEnabled: true });
    await createCaller(env.context).messages.send({ threadId: "77", text: "yo" });
    const sent = env.engineCalls.find((call) => call.method === "POST");
    expect(sent).toMatchObject({ path: "/v1/threads/77/messages", body: '{"text":"yo"}' });
  });

  it("maps a disabled engine send to a bad gateway", async () => {
    const env = await createTestEnv(undefined, {
      dmSendEnabled: true,
      engine: (call) =>
        call.method === "POST" ? new EngineFailure(403, { code: "send_disabled" }) : respond(call),
    });
    await expect(
      createCaller(env.context).messages.send({ threadId: "77", text: "yo" }),
    ).rejects.toMatchObject({ code: "BAD_GATEWAY" });
  });
});

describe("engine session checks", () => {
  it("keeps an active session active with one cheap engine call", async () => {
    const env = await createTestEnv(undefined, { engine: respond, dmSendEnabled: true });
    await runKeepAlive(env.deps);
    expect(env.engineCalls.map((call) => call.path)).toEqual(["/v1/session", "/v1/following"]);
    expect(env.engineCalls[1]?.query).toEqual({ amount: "1" });
    const [run] = await env.db.select().from(syncRuns);
    expect(run?.status).toBe("done");
  });

  it("flips the session when the engine reports it expired", async () => {
    const env = await createTestEnv(undefined, {
      dmSendEnabled: true,
      engine: (call) =>
        call.path === "/v1/following"
          ? new EngineFailure(401, { code: "session_expired" })
          : respond(call),
    });
    await runKeepAlive(env.deps);
    const [session] = await env.db.select().from(igSessions);
    expect(session?.status).toBe("expired");
  });

  it("recheck pushes the stored session to the engine before checking", async () => {
    const env = await createTestEnv(undefined, { engine: respond, dmSendEnabled: true });
    await env.db.update(igSessions).set({ status: "expired" });
    const caller = createCaller(env.context);
    await expect(caller.refresh.recheck()).resolves.toEqual({ sessionStatus: "active" });
    expect(env.engineCalls.map((call) => `${call.method} ${call.path}`)).toEqual([
      "PUT /v1/session",
      "GET /v1/following",
    ]);
    expect(env.engineCalls[0]?.body).toBe('{"sessionid":"s"}');
  });
});
