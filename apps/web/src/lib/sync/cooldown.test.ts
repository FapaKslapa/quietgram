import { describe, expect, it } from "vitest";
import { remainingCooldownMs } from "@/lib/sync/cooldown";

const FIVE_MINUTES = 300_000;
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
