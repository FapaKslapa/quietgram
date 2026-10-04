import { describe, expect, it } from "vitest";
import { isSessionChange } from "#ext/session-watch";

describe("isSessionChange", () => {
  it("matches the instagram sessionid cookie", () => {
    expect(isSessionChange({ name: "sessionid", domain: ".instagram.com" })).toBe(true);
    expect(isSessionChange({ name: "sessionid", domain: "www.instagram.com" })).toBe(true);
  });

  it("ignores other cookies and other sites", () => {
    expect(isSessionChange({ name: "csrftoken", domain: ".instagram.com" })).toBe(false);
    expect(isSessionChange({ name: "sessionid", domain: ".example.com" })).toBe(false);
    expect(isSessionChange({ name: "sessionid", domain: ".notinstagram.com" })).toBe(false);
  });
});
