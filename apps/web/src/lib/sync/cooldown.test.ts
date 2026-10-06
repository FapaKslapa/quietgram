import { describe, expect, it } from "vitest";
import {
  isWithinWindow,
  MESSAGES_COOLDOWN_MS,
  REFRESH_COOLDOWN_MS,
  remainingCooldownMs,
  THROTTLE_COOLDOWN_MS,
  throttleMarker,
} from "@/lib/sync/cooldown";

const FIVE_MINUTES = 300_000;
const FIFTEEN_MINUTES = 900_000;
const now = new Date("2026-10-04T12:00:00Z");

describe("remainingCooldownMs", () => {
  it("is zero without a previous refresh", () => {
    expect(remainingCooldownMs(null, now, FIVE_MINUTES)).toBe(0);
  });

  it("returns the remainder inside the cooldown", () => {
    const last = new Date(now.getTime() - 120_000);
    expect(remainingCooldownMs(last, now, FIVE_MINUTES)).toBe(180_000);
  });

  it("is zero exactly at and after the cooldown", () => {
    expect(remainingCooldownMs(new Date(now.getTime() - FIVE_MINUTES), now, FIVE_MINUTES)).toBe(0);
    expect(remainingCooldownMs(new Date(now.getTime() - 900_000), now, FIVE_MINUTES)).toBe(0);
  });
});

describe("cooldown constants", () => {
  it("waits fifteen minutes between refreshes and thirty after a throttle", () => {
    expect(REFRESH_COOLDOWN_MS).toBe(FIFTEEN_MINUTES);
    expect(THROTTLE_COOLDOWN_MS).toBe(2 * FIFTEEN_MINUTES);
    expect(throttleMarker(now).getTime()).toBe(now.getTime() + FIFTEEN_MINUTES);
  });
});

describe("isWithinWindow", () => {
  it("is false without a previous sync", () => {
    expect(isWithinWindow(null, now, MESSAGES_COOLDOWN_MS)).toBe(false);
  });

  it("is true inside 60 seconds and false at the edge", () => {
    expect(isWithinWindow(new Date(now.getTime() - 59_000), now, MESSAGES_COOLDOWN_MS)).toBe(true);
    expect(isWithinWindow(new Date(now.getTime() - 60_000), now, MESSAGES_COOLDOWN_MS)).toBe(
      false,
    );
  });
});
