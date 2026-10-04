import { describe, expect, it } from "vitest";
import {
  appendUnique,
  buildConversation,
  canSend,
  counterLabel,
  isOverLimit,
  sendFailureMessage,
  showCounter,
  threadLabel,
} from "@/lib/messages";

const at = (iso: string) => new Date(iso).getTime();
const NOW = at("2026-10-04T10:00:00Z");

describe("canSend", () => {
  it("rejects empty and whitespace-only text", () => {
    expect(canSend("")).toBe(false);
    expect(canSend("  \n\t ")).toBe(false);
  });

  it("accepts text up to 1000 characters after trimming", () => {
    expect(canSend("ciao")).toBe(true);
    expect(canSend(`  ${"a".repeat(1000)}  `)).toBe(true);
    expect(canSend("a".repeat(1001))).toBe(false);
  });
});

describe("character counter", () => {
  it("appears only near the limit", () => {
    expect(showCounter("a".repeat(899))).toBe(false);
    expect(showCounter("a".repeat(900))).toBe(true);
  });

  it("counts down and goes negative over the limit", () => {
    expect(counterLabel("a".repeat(950))).toBe("50");
    expect(counterLabel("a".repeat(1003))).toBe("-3");
    expect(isOverLimit("a".repeat(1001))).toBe(true);
    expect(isOverLimit("a".repeat(1000))).toBe(false);
  });
});

describe("buildConversation", () => {
  const messages = [
    { id: "1", senderId: "peer", text: "Ciao", sentAt: at("2026-10-03T07:14:00Z") },
    { id: "2", senderId: "me", text: "Sì", sentAt: at("2026-10-03T07:20:00Z") },
    { id: "3", senderId: "peer", text: null, sentAt: at("2026-10-03T07:21:00Z") },
    { id: "4", senderId: "peer", text: "Dai", sentAt: at("2026-10-04T06:21:00Z") },
  ];

  it("inserts a separator per day and marks own messages", () => {
    expect(buildConversation(messages, "me", NOW)).toEqual([
      { kind: "day", key: "day-2026-10-03", label: "Ieri" },
      { kind: "message", key: "1", mine: false, text: "Ciao", time: "09:14" },
      { kind: "message", key: "2", mine: true, text: "Sì", time: "09:20" },
      { kind: "day", key: "day-2026-10-04", label: "Oggi" },
      { kind: "message", key: "4", mine: false, text: "Dai", time: "08:21" },
    ]);
  });

  it("treats nothing as mine without a viewer id", () => {
    const items = buildConversation(messages, null, NOW);
    expect(items.every((item) => item.kind === "day" || !item.mine)).toBe(true);
  });

  it("splits days at Rome midnight", () => {
    const items = buildConversation(
      [
        { id: "a", senderId: "x", text: "uno", sentAt: at("2026-10-03T21:59:00Z") },
        { id: "b", senderId: "x", text: "due", sentAt: at("2026-10-03T22:01:00Z") },
      ],
      "me",
      NOW,
    );
    expect(items.filter((item) => item.kind === "day")).toHaveLength(2);
  });
});

describe("appendUnique", () => {
  it("adds a new message once", () => {
    const base = [{ id: "1", senderId: "me", text: "a", sentAt: 1 }];
    const next = { id: "2", senderId: "me", text: "b", sentAt: 2 };
    expect(appendUnique(base, next)).toHaveLength(2);
    expect(appendUnique(appendUnique(base, next), next)).toHaveLength(2);
  });
});

describe("sendFailureMessage", () => {
  it("explains an expired session", () => {
    const error = { data: { failure: { reason: "session_expired" } } };
    expect(sendFailureMessage(error)).toContain("sessione");
  });

  it("explains an invalid message", () => {
    expect(sendFailureMessage({ data: { code: "BAD_REQUEST" } })).toContain("1000");
  });

  it("falls back to a retry hint", () => {
    expect(sendFailureMessage(new Error("boom"))).toContain("riprova");
  });
});

describe("threadLabel", () => {
  it("flags unread threads for screen readers", () => {
    expect(threadLabel("giulia.r", true)).toBe("giulia.r, messaggi non letti");
    expect(threadLabel("giulia.r", false)).toBe("giulia.r");
  });
});
