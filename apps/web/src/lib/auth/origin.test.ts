import { describe, expect, it } from "vitest";
import { isTrustedRequestOrigin } from "@/lib/auth/origin";

const BASE = "https://app.example.com/some/path";

const request = (method: string, origin?: string) =>
  new Request("https://app.example.com/api/trpc/x", {
    method,
    headers: origin ? { origin } : {},
  });

describe("isTrustedRequestOrigin", () => {
  it("lets reads through whatever the origin", () => {
    expect(isTrustedRequestOrigin(request("GET", "https://evil.example"), BASE)).toBe(true);
  });

  it("accepts writes from the app origin or without an origin header", () => {
    expect(isTrustedRequestOrigin(request("POST", "https://app.example.com"), BASE)).toBe(true);
    expect(isTrustedRequestOrigin(request("POST"), BASE)).toBe(true);
  });

  it("rejects writes from another origin", () => {
    expect(isTrustedRequestOrigin(request("POST", "https://evil.example"), BASE)).toBe(false);
    expect(isTrustedRequestOrigin(request("POST", "http://app.example.com"), BASE)).toBe(false);
    expect(isTrustedRequestOrigin(request("POST", "null"), BASE)).toBe(false);
  });
});
