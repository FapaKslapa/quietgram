import { describe, expect, it } from "vitest";
import { GRAYSCALE_CLASS, mediaToneClass } from "@/lib/media-tone";

describe("mediaToneClass", () => {
  it("returns the grayscale class only when enabled", () => {
    expect(mediaToneClass(true)).toBe(GRAYSCALE_CLASS);
    expect(mediaToneClass(false)).toBe("");
  });
});
