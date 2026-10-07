import { describe, expect, it } from "vitest";
import { FAST_LIMITS, limitsFor, NORMAL_LIMITS, resolveProfile } from "@/lib/sync/limits";

const now = new Date("2026-10-04T12:00:00Z");
const later = new Date(now.getTime() + 60_000);
const earlier = new Date(now.getTime() - 60_000);

describe("resolveProfile", () => {
  it("is fast only for a credentials session outside the backoff", () => {
    expect(resolveProfile("credentials", null, now)).toBe("fast");
    expect(resolveProfile("credentials", earlier, now)).toBe("fast");
  });

  it("steps down to normal while the backoff is open", () => {
    expect(resolveProfile("credentials", later, now)).toBe("normal");
  });

  it("stays normal for extension sessions and missing sessions", () => {
    expect(resolveProfile("extension", null, now)).toBe("normal");
    expect(resolveProfile(null, null, now)).toBe("normal");
  });
});

describe("limits", () => {
  it("makes the fast profile quicker and larger than normal", () => {
    expect(FAST_LIMITS.cooldownMs).toBe(120_000);
    expect(NORMAL_LIMITS.cooldownMs).toBe(900_000);
    expect(FAST_LIMITS.authorsPerStep).toBeGreaterThan(NORMAL_LIMITS.authorsPerStep);
    expect(FAST_LIMITS.maxAuthors).toBeGreaterThan(NORMAL_LIMITS.maxAuthors);
    expect(limitsFor("fast")).toBe(FAST_LIMITS);
    expect(limitsFor("normal")).toBe(NORMAL_LIMITS);
  });
});
