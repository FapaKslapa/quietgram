import { describe, expect, it } from "vitest";
import {
  accumulate,
  BUDGET_LOCK_MS,
  budgetLabel,
  budgetReached,
  isBudgetMinutes,
  isLocked,
  lockExpiry,
  MAX_TICK_MS,
  usedMinutes,
} from "@/lib/budget";

describe("accumulate", () => {
  it("adds elapsed time while visible", () => {
    expect(accumulate(1_000, 1_000, true)).toBe(2_000);
  });

  it("pauses while hidden", () => {
    expect(accumulate(1_000, 1_000, false)).toBe(1_000);
  });

  it("caps a long gap to one tick so a sleeping device does not count", () => {
    expect(accumulate(0, 600_000, true)).toBe(MAX_TICK_MS);
  });

  it("ignores negative elapsed time", () => {
    expect(accumulate(500, -50, true)).toBe(500);
  });
});

describe("budgetReached", () => {
  it("is never reached when the budget is off", () => {
    expect(budgetReached(10 ** 9, null)).toBe(false);
  });

  it("is reached exactly at the threshold", () => {
    expect(budgetReached(5 * 60_000 - 1, 5)).toBe(false);
    expect(budgetReached(5 * 60_000, 5)).toBe(true);
  });
});

describe("lock", () => {
  it("expires sixty minutes after it starts", () => {
    expect(lockExpiry(1_000)).toBe(1_000 + BUDGET_LOCK_MS);
    expect(BUDGET_LOCK_MS).toBe(3_600_000);
  });

  it("is active strictly before the expiry", () => {
    expect(isLocked(2_000, 1_999)).toBe(true);
    expect(isLocked(2_000, 2_000)).toBe(false);
    expect(isLocked(null, 0)).toBe(false);
  });
});

describe("helpers", () => {
  it("accepts only the offered choices", () => {
    expect([5, 10, 15, 30].every(isBudgetMinutes)).toBe(true);
    expect(isBudgetMinutes(7)).toBe(false);
  });

  it("floors used time to whole minutes", () => {
    expect(usedMinutes(119_999)).toBe(1);
  });

  it("labels the choices", () => {
    expect(budgetLabel(null)).toBe("Spento");
    expect(budgetLabel(15)).toBe("15 minuti");
  });
});
