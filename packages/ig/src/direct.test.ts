import { describe, expect, it } from "vitest";
import inboxFixture from "#fixtures/inbox.json" with { type: "json" };
import threadFixture from "#fixtures/thread.json" with { type: "json" };
import { fetchInbox, fetchThread, sendText, validateDmText } from "#ig/direct";
import type { Requester } from "#ig/request";

type Call = { path: string; body: Record<string, string> };

const fakeRequester = (response: unknown) => {
  const gets: string[] = [];
  const posts: Call[] = [];
  const requester: Requester = {
    get: async (path) => {
      gets.push(path);
      return response;
    },
    postForm: async (path, body) => {
      posts.push({ path, body });
      return response;
    },
  };
  return { requester, gets, posts };
};

describe("validateDmText", () => {
  it("trims", () => {
    expect(validateDmText(" hi ")).toBe("hi");
  });

  it("rejects empty and whitespace", () => {
    expect(() => validateDmText("")).toThrow(RangeError);
    expect(() => validateDmText("  \n\t ")).toThrow(RangeError);
  });

  it("rejects text over 1000 characters", () => {
    expect(() => validateDmText("a".repeat(1001))).toThrow(RangeError);
    expect(validateDmText("a".repeat(1000))).toHaveLength(1000);
  });
});

describe("sendText", () => {
  it("posts a send_item form with thread ids and a uuid", async () => {
    const { requester, posts } = fakeRequester({ status: "ok" });
    await sendText(requester, "7134", " hello ");
    expect(posts).toHaveLength(1);
    const [post] = posts;
    expect(post?.path).toBe("/api/v1/direct_v2/threads/broadcast/text/");
    expect(post?.body).toMatchObject({
      action: "send_item",
      thread_ids: '["7134"]',
      text: "hello",
    });
    expect(post?.body.client_context).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it("never touches the network when the text is invalid", async () => {
    const { requester, posts } = fakeRequester({ status: "ok" });
    await expect(sendText(requester, "7134", "   ")).rejects.toThrow(RangeError);
    await expect(sendText(requester, "7134", "a".repeat(1001))).rejects.toThrow(RangeError);
    expect(posts).toEqual([]);
  });

  it("fails when instagram does not answer ok", async () => {
    const { requester } = fakeRequester({ status: "fail" });
    await expect(sendText(requester, "7134", "hi")).rejects.toThrow();
  });
});

describe("fetchInbox", () => {
  it("maps threads", async () => {
    const { requester, gets } = fakeRequester(inboxFixture);
    const threads = await fetchInbox(requester);
    expect(gets).toEqual(["/api/v1/direct_v2/inbox/"]);
    expect(threads).toHaveLength(inboxFixture.inbox.threads.length);
    expect(threads[0]).toEqual({
      id: inboxFixture.inbox.threads[0]?.thread_id,
      title: "Fake thread 1",
      lastActivityAt: Math.floor((inboxFixture.inbox.threads[0]?.last_activity_at ?? 0) / 1000),
      unread: true,
    });
  });
});

describe("fetchThread", () => {
  it("maps messages with null text for non-text items", async () => {
    const { requester, gets } = fakeRequester(threadFixture);
    const messages = await fetchThread(requester, "7134");
    expect(gets).toEqual(["/api/v1/direct_v2/threads/7134/"]);
    expect(messages).toHaveLength(threadFixture.thread.items.length);
    expect(messages.find((message) => message.type === "text")?.text).toBe("Fake message");
    expect(messages.find((message) => message.type === "clip")?.text).toBeNull();
    expect(messages[0]?.sentAt).toBe(
      Math.floor((threadFixture.thread.items[0]?.timestamp ?? 0) / 1000),
    );
  });
});
