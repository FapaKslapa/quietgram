import { describe, expect, it } from "vitest";
import {
  appendUnique,
  attachmentLabel,
  buildConversation,
  type ThreadMessage,
  threadPreview,
} from "@/lib/messages";
import { at, NOW } from "@/test/messages-clock";

describe("buildConversation", () => {
  const message = (
    id: string,
    senderId: string,
    text: string | null,
    sentAt: number,
    kind: ThreadMessage["kind"] = "text",
  ): ThreadMessage => ({ id, senderId, text, kind, sentAt });

  const messages = [
    message("1", "peer", "Ciao", at("2026-10-03T07:14:00Z")),
    message("2", "me", "Sì", at("2026-10-03T07:20:00Z")),
    message("3", "peer", null, at("2026-10-03T07:21:00Z"), "other"),
    message("4", "peer", "Dai", at("2026-10-04T06:21:00Z")),
  ];

  it("inserts a separator per day and marks own messages", () => {
    expect(buildConversation(messages, "me", NOW)).toEqual([
      { kind: "day", key: "day-2026-10-03", label: "Ieri" },
      {
        kind: "message",
        key: "1",
        mine: false,
        text: "Ciao",
        attachment: null,
        time: "09:14",
        first: true,
        last: true,
      },
      {
        kind: "message",
        key: "2",
        mine: true,
        text: "Sì",
        attachment: null,
        time: "09:20",
        first: true,
        last: true,
      },
      {
        kind: "message",
        key: "3",
        mine: false,
        text: null,
        attachment: "Allegato",
        time: "09:21",
        first: true,
        last: true,
      },
      { kind: "day", key: "day-2026-10-04", label: "Oggi" },
      {
        kind: "message",
        key: "4",
        mine: false,
        text: "Dai",
        attachment: null,
        time: "08:21",
        first: true,
        last: true,
      },
    ]);
  });

  it("renders media as quiet placeholders and drops empty text", () => {
    const items = buildConversation(
      [
        message("a", "peer", null, at("2026-10-04T08:00:00Z"), "photo"),
        message("b", "peer", null, at("2026-10-04T08:01:00Z"), "video"),
        message("c", "peer", null, at("2026-10-04T08:02:00Z"), "voice"),
        message("d", "peer", null, at("2026-10-04T08:03:00Z"), "text"),
      ],
      "me",
      NOW,
    );
    const labels = items.flatMap((item) => (item.kind === "message" ? [item.attachment] : []));
    expect(labels).toEqual(["Foto", "Video", "Messaggio vocale"]);
  });

  it("groups consecutive messages from the same sender within a day", () => {
    const items = buildConversation(
      [
        message("a", "peer", "uno", at("2026-10-04T08:00:00Z")),
        message("b", "peer", "due", at("2026-10-04T08:01:00Z")),
        message("c", "peer", "tre", at("2026-10-04T08:02:00Z")),
        message("d", "me", "ok", at("2026-10-04T08:03:00Z")),
      ],
      "me",
      NOW,
    );
    const flags = items.flatMap((item) =>
      item.kind === "message" ? [[item.key, item.first, item.last]] : [],
    );
    expect(flags).toEqual([
      ["a", true, false],
      ["b", false, false],
      ["c", false, true],
      ["d", true, true],
    ]);
  });

  it("treats nothing as mine without a viewer id", () => {
    const items = buildConversation(messages, null, NOW);
    expect(items.every((item) => item.kind === "day" || !item.mine)).toBe(true);
  });

  it("splits days at Rome midnight and never groups across them", () => {
    const items = buildConversation(
      [
        message("a", "x", "uno", at("2026-10-03T21:59:00Z")),
        message("b", "x", "due", at("2026-10-03T22:01:00Z")),
      ],
      "me",
      NOW,
    );
    expect(items.filter((item) => item.kind === "day")).toHaveLength(2);
    expect(items.flatMap((item) => (item.kind === "message" ? [item.first] : []))).toEqual([
      true,
      true,
    ]);
  });
});

describe("placeholders", () => {
  it("labels attachments and falls back for the thread preview", () => {
    expect(attachmentLabel("text")).toBeNull();
    expect(threadPreview("ciao", "text")).toBe("ciao");
    expect(threadPreview(null, "voice")).toBe("Messaggio vocale");
    expect(threadPreview(null, null)).toBe("Nessun messaggio");
  });
});

describe("appendUnique", () => {
  it("adds a new message once", () => {
    const base = [{ id: "1", senderId: "me", text: "a", kind: "text" as const, sentAt: 1 }];
    const next = { id: "2", senderId: "me", text: "b", kind: "text" as const, sentAt: 2 };
    expect(appendUnique(base, next)).toHaveLength(2);
    expect(appendUnique(appendUnique(base, next), next)).toHaveLength(2);
  });
});
