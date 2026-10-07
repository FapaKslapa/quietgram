import { describe, expect, it } from "vitest";
import {
  isAllowedMediaType,
  MAX_MEDIA_URL_LENGTH,
  mediaSrc,
  parseMediaTarget,
} from "@/lib/media-proxy";

describe("parseMediaTarget", () => {
  it("accepts https instagram cdn hosts", () => {
    expect(parseMediaTarget("https://scontent-fco2-1.cdninstagram.com/v/a.jpg?x=1")?.hostname).toBe(
      "scontent-fco2-1.cdninstagram.com",
    );
    expect(parseMediaTarget("https://scontent.xx.fbcdn.net/v/a.mp4")?.hostname).toBe(
      "scontent.xx.fbcdn.net",
    );
  });

  it("rejects insecure and exotic schemes", () => {
    expect(parseMediaTarget("http://scontent.cdninstagram.com/a.jpg")).toBeNull();
    expect(parseMediaTarget("data:image/svg+xml,<svg/>")).toBeNull();
    expect(parseMediaTarget("javascript:alert(1)")).toBeNull();
    expect(parseMediaTarget("//scontent.cdninstagram.com/a.jpg")).toBeNull();
    expect(parseMediaTarget("file:///etc/passwd")).toBeNull();
  });

  it("rejects userinfo tricks", () => {
    expect(parseMediaTarget("https://scontent.cdninstagram.com@evil.com/a.jpg")).toBeNull();
    expect(parseMediaTarget("https://user:pw@scontent.cdninstagram.com/a.jpg")).toBeNull();
    expect(parseMediaTarget("https://evil.com\\@scontent.cdninstagram.com/a.jpg")).toBeNull();
  });

  it("rejects lookalike hosts", () => {
    expect(parseMediaTarget("https://cdninstagram.com.evil.com/a.jpg")).toBeNull();
    expect(parseMediaTarget("https://evilcdninstagram.com/a.jpg")).toBeNull();
    expect(parseMediaTarget("https://scontent.cdninstagram.com.evil.com/a.jpg")).toBeNull();
    expect(parseMediaTarget("https://fbcdn.net/a.jpg")).toBeNull();
    expect(parseMediaTarget("https://xfbcdn.net/a.jpg")).toBeNull();
    expect(parseMediaTarget("https://scontent.cdninstagram.com./a.jpg")).toBeNull();
  });

  it("rejects ip literals and ports", () => {
    expect(parseMediaTarget("https://127.0.0.1/a.jpg")).toBeNull();
    expect(parseMediaTarget("https://[::1]/a.jpg")).toBeNull();
    expect(parseMediaTarget("https://2130706433/a.jpg")).toBeNull();
    expect(parseMediaTarget("https://169.254.169.254/latest")).toBeNull();
    expect(parseMediaTarget("https://scontent.cdninstagram.com:8443/a.jpg")).toBeNull();
  });

  it("rejects empty, malformed and oversized input", () => {
    expect(parseMediaTarget(null)).toBeNull();
    expect(parseMediaTarget("")).toBeNull();
    expect(parseMediaTarget("https://")).toBeNull();
    const long = `https://scontent.cdninstagram.com/${"a".repeat(MAX_MEDIA_URL_LENGTH)}`;
    expect(parseMediaTarget(long)).toBeNull();
  });
});

describe("isAllowedMediaType", () => {
  it("allows images and videos only", () => {
    expect(isAllowedMediaType("image/jpeg")).toBe(true);
    expect(isAllowedMediaType("video/mp4")).toBe(true);
    expect(isAllowedMediaType("text/html")).toBe(false);
    expect(isAllowedMediaType("application/json")).toBe(false);
    expect(isAllowedMediaType(null)).toBe(false);
  });
});

describe("mediaSrc", () => {
  it("routes allowed remote media through the proxy", () => {
    const src = mediaSrc("https://scontent.cdninstagram.com/a.jpg?x=1&y=2");
    expect(src).toBe(
      `/api/media?u=${encodeURIComponent("https://scontent.cdninstagram.com/a.jpg?x=1&y=2")}`,
    );
  });

  it("leaves other sources untouched", () => {
    expect(mediaSrc("data:image/svg+xml,<svg/>")).toBe("data:image/svg+xml,<svg/>");
    expect(mediaSrc("https://evil.com/a.jpg")).toBe("https://evil.com/a.jpg");
    expect(mediaSrc(null)).toBeUndefined();
    expect(mediaSrc("")).toBeUndefined();
  });
});
