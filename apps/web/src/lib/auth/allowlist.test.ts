import { describe, expect, it } from "vitest";
import { canBootstrap, isAllowed } from "./allowlist";

describe("isAllowed", () => {
  it("accepts listed emails case-insensitively and trimmed", () => {
    expect(isAllowed("  Me@Example.com ", "me@example.com, friend@example.com")).toBe(true);
    expect(isAllowed("friend@example.com", " ME@example.com ,Friend@Example.com")).toBe(true);
  });

  it("rejects unlisted emails", () => {
    expect(isAllowed("other@example.com", "me@example.com")).toBe(false);
  });

  it("rejects everything when the list is empty", () => {
    expect(isAllowed("me@example.com", "")).toBe(false);
    expect(isAllowed("", " , ")).toBe(false);
  });
});

describe("canBootstrap", () => {
  const config = { allowedEmails: "me@example.com", bootstrapSecret: "s".repeat(16) };

  it("requires an allowlisted email and the matching secret", () => {
    expect(canBootstrap({ email: "me@example.com", secret: "s".repeat(16) }, config)).toBe(true);
    expect(canBootstrap({ email: "me@example.com", secret: "x".repeat(16) }, config)).toBe(false);
    expect(canBootstrap({ email: "me@example.com", secret: null }, config)).toBe(false);
    expect(canBootstrap({ email: "no@example.com", secret: "s".repeat(16) }, config)).toBe(false);
  });
});
