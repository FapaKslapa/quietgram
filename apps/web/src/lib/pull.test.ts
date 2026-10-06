import { describe, expect, it } from "vitest";
import {
  classifyPullStart,
  decidePull,
  PULL_MAX,
  PULL_THRESHOLD,
  pullLabel,
  pullPhase,
  pullProgress,
  pullResistance,
} from "@/lib/pull";

describe("pullResistance", () => {
  it("is zero for no or upward movement", () => {
    expect(pullResistance(0)).toBe(0);
    expect(pullResistance(-40)).toBe(0);
  });

  it("grows monotonically and never exceeds the maximum", () => {
    let previous = 0;
    for (const raw of [10, 40, 80, 160, 400, 4000]) {
      const value = pullResistance(raw);
      expect(value).toBeGreaterThan(previous);
      expect(value).toBeLessThan(PULL_MAX + 1e-9);
      previous = value;
    }
  });

  it("resists: the visible distance is always smaller than the finger distance", () => {
    for (const raw of [20, 60, 120, 240]) expect(pullResistance(raw)).toBeLessThan(raw);
  });

  it("crosses the threshold with a comfortable thumb travel", () => {
    expect(pullResistance(100)).toBeLessThan(PULL_THRESHOLD);
    expect(pullResistance(160)).toBeGreaterThan(PULL_THRESHOLD);
  });
});

describe("pullProgress", () => {
  it("is clamped between zero and one", () => {
    expect(pullProgress(-5)).toBe(0);
    expect(pullProgress(PULL_THRESHOLD / 2)).toBe(0.5);
    expect(pullProgress(PULL_MAX)).toBe(1);
  });
});

describe("pullPhase and decidePull", () => {
  it("walks through the phases", () => {
    expect(pullPhase(0, false, false)).toBe("idle");
    expect(pullPhase(30, false, false)).toBe("pulling");
    expect(pullPhase(PULL_THRESHOLD, false, false)).toBe("armed");
    expect(pullPhase(PULL_THRESHOLD, true, false)).toBe("blocked");
    expect(pullPhase(0, false, true)).toBe("refreshing");
  });

  it("triggers only past the threshold and when allowed", () => {
    expect(decidePull(PULL_THRESHOLD - 1, false, false)).toBe("rebound");
    expect(decidePull(PULL_THRESHOLD, false, false)).toBe("trigger");
    expect(decidePull(PULL_THRESHOLD, true, false)).toBe("blocked");
    expect(decidePull(PULL_THRESHOLD, false, true)).toBe("blocked");
  });
});

describe("pullLabel", () => {
  it("speaks in Italian and shows the next possible time while blocked", () => {
    expect(pullLabel("idle", "x")).toBeNull();
    expect(pullLabel("pulling", "x")).toBe("Tira per aggiornare");
    expect(pullLabel("armed", "x")).toBe("Rilascia per aggiornare");
    expect(pullLabel("blocked", "Prossimo aggiornamento dalle 14:51")).toBe(
      "Prossimo aggiornamento dalle 14:51",
    );
    expect(pullLabel("refreshing", "x")).toBe("Aggiornamento in corso");
  });
});

describe("classifyPullStart", () => {
  const origin = { x: 100, y: 100 };

  it("waits for a few pixels of movement", () => {
    expect(classifyPullStart(origin, { x: 101, y: 102 })).toBe("undecided");
  });

  it("claims a mostly vertical downward drag", () => {
    expect(classifyPullStart(origin, { x: 104, y: 120 })).toBe("pull");
  });

  it("ignores upward and sideways drags", () => {
    expect(classifyPullStart(origin, { x: 100, y: 80 })).toBe("ignore");
    expect(classifyPullStart(origin, { x: 140, y: 110 })).toBe("ignore");
  });
});
