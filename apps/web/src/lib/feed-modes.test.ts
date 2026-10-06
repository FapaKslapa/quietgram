import { describe, expect, it } from "vitest";
import {
  formatFollowers,
  MODES,
  modeDefinition,
  RECENCY_STEPS,
  recencyAt,
  recencyIndex,
  THRESHOLD_STEPS,
  thresholdAt,
  thresholdIndex,
} from "@/lib/feed-modes";

describe("feed modes", () => {
  it("gives every mode a distinct weave", () => {
    expect(new Set(MODES.map((mode) => mode.weave)).size).toBe(MODES.length);
  });

  it("looks a mode up by key", () => {
    expect(modeDefinition("creators").label).toBe("Creator");
  });
});

describe("threshold steps", () => {
  it("formats with Italian thousands separators", () => {
    expect(formatFollowers(1000)).toBe("1.000");
    expect(formatFollowers(500000)).toBe("500.000");
    expect(formatFollowers(12)).toBe("12");
  });

  it("maps a stored value to the nearest step", () => {
    expect(thresholdIndex(10_000)).toBe(2);
    expect(thresholdIndex(0)).toBe(0);
    expect(thresholdIndex(20_000)).toBe(2);
    expect(thresholdIndex(40_000)).toBe(3);
    expect(thresholdIndex(9_000_000)).toBe(THRESHOLD_STEPS.length - 1);
  });

  it("clamps the slider index", () => {
    expect(thresholdAt(-1)).toBe(1_000);
    expect(thresholdAt(99)).toBe(500_000);
    expect(thresholdAt(3)).toBe(50_000);
  });
});

describe("recency steps", () => {
  it("maps days to the nearest step at or above and back", () => {
    expect(RECENCY_STEPS).toEqual([3, 7, 14, 30, 60]);
    expect(recencyIndex(14)).toBe(2);
    expect(recencyIndex(10)).toBe(2);
    expect(recencyIndex(99)).toBe(4);
    expect(recencyAt(-1)).toBe(3);
    expect(recencyAt(3)).toBe(30);
    expect(recencyAt(9)).toBe(60);
  });
});
