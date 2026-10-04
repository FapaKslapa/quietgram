import { describe, expect, it } from "vitest";
import { formatCountdown, isExpired, remainingMs } from "@/lib/pairing-countdown";

describe("formatCountdown", () => {
  it("renders minutes and padded seconds", () => {
    expect(formatCountdown(600_000)).toBe("10:00");
    expect(formatCountdown(61_000)).toBe("1:01");
    expect(formatCountdown(9_000)).toBe("0:09");
  });

  it("rounds partial seconds up and never goes negative", () => {
    expect(formatCountdown(500)).toBe("0:01");
    expect(formatCountdown(-5_000)).toBe("0:00");
  });
});

describe("remainingMs", () => {
  it("clamps at zero", () => {
    expect(remainingMs(1_000, 400)).toBe(600);
    expect(remainingMs(1_000, 2_000)).toBe(0);
  });

  it("flags expiry", () => {
    expect(isExpired(1_000, 999)).toBe(false);
    expect(isExpired(1_000, 1_000)).toBe(true);
  });
});
