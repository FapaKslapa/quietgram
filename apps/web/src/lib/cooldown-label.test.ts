import { describe, expect, it } from "vitest";
import { cooldownMessage, formatRemaining } from "@/lib/cooldown-label";

describe("formatRemaining", () => {
  it("shows seconds under a minute", () => {
    expect(formatRemaining(45)).toBe("45 s");
    expect(formatRemaining(0)).toBe("0 s");
  });

  it("shows whole minutes without seconds", () => {
    expect(formatRemaining(300)).toBe("5 min");
  });

  it("shows minutes and seconds", () => {
    expect(formatRemaining(252)).toBe("4 min 12 s");
  });

  it("rounds fractions up and clamps negatives", () => {
    expect(formatRemaining(59.2)).toBe("1 min");
    expect(formatRemaining(-5)).toBe("0 s");
  });
});

describe("cooldownMessage", () => {
  it("names the remaining time", () => {
    expect(cooldownMessage(90)).toBe("Hai già aggiornato. Riprova tra 1 min 30 s.");
  });
});
