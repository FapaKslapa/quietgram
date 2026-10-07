import { describe, expect, it } from "vitest";
import {
  canSend,
  canSubmit,
  composerHint,
  counterLabel,
  isOverLimit,
  readFailureMessage,
  sendFailureMessage,
  showCounter,
} from "@/lib/messages";

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
