import { afterEach, describe, expect, it, vi } from "vitest";
import { MAX_DELAY_MS, MIN_DELAY_MS, randomDelay } from "@/lib/sync/deps";

describe("randomDelay", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("waits between one and three seconds", () => {
    expect(MIN_DELAY_MS).toBe(1000);
    expect(MAX_DELAY_MS).toBe(3000);
  });

  it.each([
    [0, 1000],
    [0.5, 2000],
    [0.999, 2998],
  ])("waits the scaled time for a random value of %s", async (random, expected) => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(random);
    let settled = false;
    void randomDelay().then(() => {
      settled = true;
    });
    await vi.advanceTimersByTimeAsync(expected - 1);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(2);
    expect(settled).toBe(true);
  });
});
