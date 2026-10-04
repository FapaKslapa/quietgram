import { describe, expect, it } from "vitest";
import { pickWeave, WEAVE_VARIANTS } from "@/lib/weave";

describe("pickWeave", () => {
  it("is deterministic for the same author", () => {
    expect(pickWeave("1789")).toBe(pickWeave("1789"));
  });

  it("always returns a known variant", () => {
    for (let id = 0; id < 200; id += 1) {
      expect(WEAVE_VARIANTS).toContain(pickWeave(String(id * 7919)));
    }
  });

  it("spreads authors across every variant", () => {
    const seen = new Set(Array.from({ length: 200 }, (_, id) => pickWeave(`author-${id}`)));
    expect(seen.size).toBe(WEAVE_VARIANTS.length);
  });

  it("handles an empty id", () => {
    expect(WEAVE_VARIANTS).toContain(pickWeave(""));
  });
});
