import { describe, expect, it } from "vitest";
import { clampIndex, indexFromScroll, mediaAspectRatio } from "@/lib/carousel";

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

describe("indexFromScroll", () => {
  it("maps scroll offset to the nearest slide", () => {
    expect(indexFromScroll(0, 400, 3)).toBe(0);
    expect(indexFromScroll(210, 400, 3)).toBe(1);
    expect(indexFromScroll(5000, 400, 3)).toBe(2);
  });

  it("ignores an unmeasured container", () => {
    expect(indexFromScroll(100, 0, 3)).toBe(0);
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
