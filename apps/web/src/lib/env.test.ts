import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

const valid = {
  BETTER_AUTH_SECRET: "a".repeat(32),
  BETTER_AUTH_URL: "http://localhost:8787",
  ALLOWED_EMAILS: "me@example.com",
  COOKIE_KEY: "b".repeat(32),
  BOOTSTRAP_SECRET: "c".repeat(16),
};

describe("parseEnv", () => {
  it("returns typed data for a valid env", () => {
    expect(parseEnv(valid)).toEqual(valid);
  });

  it("ignores unrelated bindings", () => {
    expect(parseEnv({ ...valid, DB: {} })).toEqual(valid);
  });

  it("rejects a missing key", () => {
    const { COOKIE_KEY: _omitted, ...rest } = valid;
    expect(() => parseEnv(rest)).toThrow();
  });

  it("rejects a too short secret", () => {
    expect(() => parseEnv({ ...valid, BETTER_AUTH_SECRET: "short" })).toThrow();
  });

  it("rejects an invalid base url", () => {
    expect(() => parseEnv({ ...valid, BETTER_AUTH_URL: "not a url" })).toThrow();
  });
});
