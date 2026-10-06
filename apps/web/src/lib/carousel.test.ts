import { describe, expect, it } from "vitest";
import { clampIndex, mediaAspectRatio, snapIndex, trackOffset } from "@/lib/carousel";

describe("clampIndex", () => {
  it("keeps the index inside the slides", () => {
    expect(clampIndex(-3, 5)).toBe(0);
    expect(clampIndex(9, 5)).toBe(4);
    expect(clampIndex(2, 5)).toBe(2);
  });

  it("rounds fractional positions", () => {
    expect(clampIndex(1.6, 5)).toBe(2);
  });

  it("returns zero without slides", () => {
    expect(clampIndex(3, 0)).toBe(0);
  });
});

describe("mediaAspectRatio", () => {
  it("clamps tall and wide media", () => {
    expect(mediaAspectRatio(1000, 2000)).toBe(0.8);
    expect(mediaAspectRatio(2000, 500)).toBe(1.5);
    expect(mediaAspectRatio(1080, 1080)).toBe(1);
  });

  it("falls back on invalid sizes", () => {
    expect(mediaAspectRatio(0, 0)).toBe(0.8);
  });
});

describe("snapIndex", () => {
  it("stays put on a small drag", () => {
    expect(snapIndex(1, 3, -30, 0, 400)).toBe(1);
  });

  it("advances on a long drag to the left and goes back on one to the right", () => {
    expect(snapIndex(1, 3, -150, 0, 400)).toBe(2);
    expect(snapIndex(1, 3, 150, 0, 400)).toBe(0);
  });

  it("advances on a short but fast flick", () => {
    expect(snapIndex(0, 3, -40, -900, 400)).toBe(1);
  });

  it("never leaves the range", () => {
    expect(snapIndex(0, 3, 300, 800, 400)).toBe(0);
    expect(snapIndex(2, 3, -300, -800, 400)).toBe(2);
  });

  it("handles an unmeasured width", () => {
    expect(snapIndex(1, 3, -500, 0, 0)).toBe(1);
  });
});

describe("trackOffset", () => {
  it("moves the track left by whole widths", () => {
    expect(trackOffset(2, 300)).toBe(-600);
    expect(trackOffset(0, 300)).toBe(0);
  });
});
