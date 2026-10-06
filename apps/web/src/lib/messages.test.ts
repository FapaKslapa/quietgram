import { describe, expect, it } from "vitest";
import {
  appendUnique,
  attachmentLabel,
  buildConversation,
  canSend,
  canSubmit,
  canSyncView,
  composerHint,
  counterLabel,
  createPending,
  dropMessage,
  isConversationPath,
  isOverLimit,
  isPending,
  mergeThread,
  readFailureMessage,
  sendFailureMessage,
  settlePending,
  showCounter,
  type ThreadMessage,
  threadLabel,
  threadPreview,
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

describe("composer availability", () => {
  it("submits only when sending is enabled and the text is valid", () => {
    expect(canSubmit("ciao", true)).toBe(true);
    expect(canSubmit("ciao", false)).toBe(false);
    expect(canSubmit("  ", true)).toBe(false);
  });

  it("shows a calm hint only while sending is disabled", () => {
    expect(composerHint(false)).toBe("Invio disattivato: attivalo in Profilo");
    expect(composerHint(true)).toBeNull();
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

describe("view sync guard", () => {
  it("allows a first sync and blocks repeats within 60 seconds", () => {
    expect(canSyncView(null, NOW)).toBe(true);
    expect(canSyncView(NOW - 59_000, NOW)).toBe(false);
    expect(canSyncView(NOW - 60_000, NOW)).toBe(true);
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

describe("sendFailureMessage", () => {
  it("explains an expired session", () => {
    const error = { data: { failure: { reason: "session_expired" } } };
    expect(sendFailureMessage(error)).toContain("sessione");
  });

  it("explains an invalid message", () => {
    expect(sendFailureMessage({ data: { code: "BAD_REQUEST" } })).toContain("1000");
  });

  it("shows instagram's reason for a rejected or throttled send", () => {
    const rejected = {
      message: "Instagram ha rifiutato il messaggio: spam",
      data: { failure: { reason: "rejected" } },
    };
    expect(sendFailureMessage(rejected)).toBe("Instagram ha rifiutato il messaggio: spam");
    const throttled = {
      message: "Instagram ti chiede di aspettare qualche minuto. Riprova tra un po'.",
      data: { failure: { reason: "throttled" } },
    };
    expect(sendFailureMessage(throttled)).toContain("aspettare");
  });

  it("shows the calm message when sending is switched off", () => {
    const disabled = {
      message: "L'invio dei messaggi non è ancora disponibile.",
      data: { code: "PRECONDITION_FAILED", failure: null },
    };
    expect(sendFailureMessage(disabled)).toBe("L'invio dei messaggi non è ancora disponibile.");
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

describe("readFailureMessage", () => {
  it("shows the short reason of an instagram error and falls back otherwise", () => {
    const failure = {
      message: "Non riesco a leggere i messaggi: Instagram ha risposto 502",
      data: { failure: { reason: "instagram_error" } },
    };
    expect(readFailureMessage(failure, "x")).toBe(failure.message);
    expect(readFailureMessage(new Error("boom"), "x")).toBe("x");
    expect(readFailureMessage(null, "x")).toBe("x");
  });
});
