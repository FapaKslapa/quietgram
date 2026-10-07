import { describe, expect, it } from "vitest";
import { DOUBLE_TAP_MS, registerTap } from "@/lib/double-tap";

describe("registerTap", () => {
  it("starts a window on the first tap", () => {
    expect(registerTap(null, 1_000)).toEqual({ double: false, lastTap: 1_000 });
  });

  it("detects a second tap inside the window and resets", () => {
    expect(registerTap(1_000, 1_000 + DOUBLE_TAP_MS)).toEqual({ double: true, lastTap: null });
  });

  it("restarts the window when the second tap is late", () => {
    expect(registerTap(1_000, 1_000 + DOUBLE_TAP_MS + 1)).toEqual({
      double: false,
      lastTap: 1_000 + DOUBLE_TAP_MS + 1,
    });
  });

  it("ignores a tap that appears to come before the previous one", () => {
    expect(registerTap(2_000, 1_000)).toEqual({ double: false, lastTap: 1_000 });
  });
});
