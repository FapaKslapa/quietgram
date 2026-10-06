import { describe, expect, it } from "vitest";
import { normalizeCode } from "#ext/code";
import { pairedLabel } from "#ext/date-label";
import { errorMessage } from "#ext/messages";
import { FORM_COPY, selectView, sessionLabel } from "#ext/view";

describe("selectView", () => {
  it("shows the form when never paired", () => {
    expect(selectView({ pairedAt: null, renewNeeded: false })).toBe("unpaired");
  });

  it("shows the confirmation when paired", () => {
    expect(selectView({ pairedAt: 1, renewNeeded: false })).toBe("paired");
  });

  it("prefers renewal over the confirmation", () => {
    expect(selectView({ pairedAt: 1, renewNeeded: true })).toBe("renew");
  });

  it("treats a stray renew flag without pairing as renewal", () => {
    expect(selectView({ pairedAt: null, renewNeeded: true })).toBe("renew");
  });
});

describe("form copy", () => {
  it("names the action per view", () => {
    expect(FORM_COPY.unpaired.action).toBe("Collega");
    expect(FORM_COPY.renew.action).toBe("Rinnova");
  });

  it("labels the live session check", () => {
    expect(sessionLabel(true)).toBe("Sessione Instagram trovata");
    expect(sessionLabel(false)).toContain("non è aperto");
  });
});

describe("normalizeCode", () => {
  it("trims surrounding whitespace", () => {
    expect(normalizeCode("  abc-123 \n")).toBe("abc-123");
  });

  it("removes inner whitespace from wrapped pastes", () => {
    expect(normalizeCode("abc 123\n456")).toBe("abc123456");
  });

  it("drops surrounding quotes", () => {
    expect(normalizeCode(' "abc-123" ')).toBe("abc-123");
    expect(normalizeCode("“abc-123”")).toBe("abc-123");
  });

  it("keeps the case", () => {
    expect(normalizeCode("AbC")).toBe("AbC");
  });

  it("returns an empty string for blank input", () => {
    expect(normalizeCode("   ")).toBe("");
  });
});

describe("errorMessage", () => {
  it("maps every failure to plain Italian", () => {
    expect(errorMessage("invalid_token")).toContain("scaduto o già usato");
    expect(errorMessage("no_session")).toContain("Instagram non è aperto");
    expect(errorMessage("network")).toContain("non raggiungibile");
    expect(errorMessage("rejected")).toContain("rifiutato");
    expect(errorMessage("empty")).toContain("Incolla");
  });
});

describe("pairedLabel", () => {
  it("formats the pairing date in Italian", () => {
    expect(pairedLabel(Date.UTC(2026, 9, 7, 12), "UTC")).toBe("Collegata il 7 ottobre 2026");
  });

  it("uses the given time zone", () => {
    expect(pairedLabel(Date.UTC(2026, 9, 7, 23, 30), "Europe/Rome")).toBe(
      "Collegata il 8 ottobre 2026",
    );
  });
});
