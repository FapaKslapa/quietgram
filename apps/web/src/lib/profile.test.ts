import { describe, expect, it } from "vitest";
import { isThemeChoice, sessionAction, sessionLabel, themeLabel } from "@/lib/profile";

describe("themeLabel", () => {
  it("names each choice and falls back to system", () => {
    expect(themeLabel("light")).toBe("Chiaro");
    expect(themeLabel("dark")).toBe("Scuro");
    expect(themeLabel("system")).toBe("Sistema");
    expect(themeLabel(undefined)).toBe("Sistema");
  });
});

describe("isThemeChoice", () => {
  it("accepts only the three choices", () => {
    expect(isThemeChoice("dark")).toBe(true);
    expect(isThemeChoice("sepia")).toBe(false);
    expect(isThemeChoice(undefined)).toBe(false);
  });
});

describe("session wording", () => {
  it("labels every status", () => {
    expect(sessionLabel("active")).toBe("Attiva");
    expect(sessionLabel("expired")).toBe("Scaduta");
    expect(sessionLabel("none")).toBe("Non collegata");
  });

  it("offers renew for an active session and connect otherwise", () => {
    expect(sessionAction("active")).toBe("Rinnova");
    expect(sessionAction("expired")).toBe("Collega");
    expect(sessionAction("none")).toBe("Collega");
  });
});
