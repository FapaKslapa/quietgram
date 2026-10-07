import { describe, expect, it } from "vitest";
import {
  buildConversation,
  canSyncView,
  createPending,
  dropMessage,
  isConversationPath,
  isPending,
  mergeThread,
  settlePending,
  type ThreadMessage,
  threadLabel,
} from "@/lib/messages";
import { NOW } from "@/test/messages-clock";

describe("view sync guard", () => {
  it("allows a first sync and blocks repeats within 60 seconds", () => {
    expect(canSyncView(null, NOW)).toBe(true);
    expect(canSyncView(NOW - 59_000, NOW)).toBe(false);
    expect(canSyncView(NOW - 60_000, NOW)).toBe(true);
  });
});

describe("threadLabel", () => {
  it("flags unread threads for screen readers", () => {
    expect(threadLabel("giulia.r", true)).toBe("giulia.r, messaggi non letti");
    expect(threadLabel("giulia.r", false)).toBe("giulia.r");
  });
});

describe("pending messages", () => {
  const server: ThreadMessage[] = [
    { id: "1", senderId: "peer", text: "a", kind: "text", sentAt: 1 },
  ];

  it("creates a pending message that is recognised as such", () => {
    const pending = createPending("me", "ciao", 5);
    expect(isPending(pending)).toBe(true);
    expect(isPending(server[0] as ThreadMessage)).toBe(false);
    expect(pending).toMatchObject({ senderId: "me", text: "ciao", sentAt: 5 });
  });

  it("keeps pending messages when the server list replaces the thread", () => {
    const pending = createPending("me", "ciao", 5);
    expect(mergeThread(server, [pending])).toEqual([...server, pending]);
    expect(mergeThread(server, [server[0] as ThreadMessage])).toEqual(server);
  });

  it("settles a pending message with the sent one and can drop it", () => {
    const pending = createPending("me", "ciao", 5);
    const sent: ThreadMessage = {
      id: "local-9",
      senderId: "me",
      text: "ciao",
      kind: "text",
      sentAt: 6,
    };
    expect(settlePending([...server, pending], pending.id, sent)).toEqual([
      ...server,
      { ...sent, clientKey: pending.id },
    ]);
    expect(dropMessage([...server, pending], pending.id)).toEqual(server);
  });
});

describe("isConversationPath", () => {
  it("matches a single thread only", () => {
    expect(isConversationPath("/messaggi/123")).toBe(true);
    expect(isConversationPath("/messaggi/123/")).toBe(true);
    expect(isConversationPath("/messaggi")).toBe(false);
    expect(isConversationPath("/posta")).toBe(false);
  });
});

describe("stable keys across sending", () => {
  it("keeps the client key when a pending message settles", () => {
    const pending = createPending("me", "ciao", 5);
    const sent: ThreadMessage = {
      id: "local-1",
      senderId: "me",
      text: "ciao",
      kind: "text",
      sentAt: 6,
    };
    const settled = settlePending([pending], pending.id, sent);
    expect(settled[0]?.id).toBe("local-1");
    const items = buildConversation(settled, "me", 6);
    expect(items.some((item) => item.kind === "message" && item.key === pending.id)).toBe(true);
  });
});
