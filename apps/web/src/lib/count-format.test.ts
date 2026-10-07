import { describe, expect, it } from "vitest";
import { formatCount } from "@/lib/count-format";

describe("formatCount", () => {
  it("keeps small numbers whole", () => {
    expect(formatCount(0)).toBe("0");
    expect(formatCount(999)).toBe("999");
  });

  it("groups thousands below ten thousand", () => {
    expect(formatCount(1_000)).toBe("1.000");
    expect(formatCount(9_876)).toBe("9.876");
  });

  it("abbreviates thousands with a decimal comma", () => {
    expect(formatCount(12_500)).toBe("12,5 k");
    expect(formatCount(12_000)).toBe("12 k");
    expect(formatCount(999_949)).toBe("999,9 k");
  });

  it("abbreviates millions and billions", () => {
    expect(formatCount(1_234_567)).toBe("1,2 mln");
    expect(formatCount(2_000_000)).toBe("2 mln");
    expect(formatCount(999_999)).toBe("1 mln");
    expect(formatCount(3_400_000_000)).toBe("3,4 mld");
  });

  it("clamps invalid input", () => {
    expect(formatCount(-4)).toBe("0");
    expect(formatCount(12.9)).toBe("12");
  });
});
