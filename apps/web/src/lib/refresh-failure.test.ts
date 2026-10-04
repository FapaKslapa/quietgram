import { describe, expect, it } from "vitest";
import { classifyRefreshError } from "@/lib/refresh-failure";

describe("classifyRefreshError", () => {
  it("reads the cooldown with its remaining seconds", () => {
    expect(
      classifyRefreshError({
        data: {
          code: "TOO_MANY_REQUESTS",
          failure: { reason: "cooldown", retryAfterSeconds: 120 },
        },
      }),
    ).toEqual({ kind: "cooldown", seconds: 120 });
  });

  it("falls back to a default wait for a bare rate limit", () => {
    expect(classifyRefreshError({ data: { code: "TOO_MANY_REQUESTS" } })).toEqual({
      kind: "cooldown",
      seconds: 60,
    });
  });

  it("detects an instagram throttle", () => {
    expect(
      classifyRefreshError({
        data: {
          code: "TOO_MANY_REQUESTS",
          failure: { reason: "throttled", retryAfterSeconds: 900 },
        },
      }),
    ).toEqual({ kind: "throttled", seconds: 900 });
  });

  it("detects an expired or missing session", () => {
    expect(classifyRefreshError({ data: { failure: { reason: "session_expired" } } })).toEqual({
      kind: "expired",
    });
    expect(classifyRefreshError({ data: { failure: { reason: "no_session" } } })).toEqual({
      kind: "expired",
    });
  });

  it("treats everything else as other", () => {
    expect(classifyRefreshError(new Error("boom"))).toEqual({ kind: "other" });
    expect(classifyRefreshError(null)).toEqual({ kind: "other" });
    expect(classifyRefreshError({ data: { failure: { reason: "instagram_error" } } })).toEqual({
      kind: "other",
    });
  });
});
