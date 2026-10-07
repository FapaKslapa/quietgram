import { describe, expect, it } from "vitest";
import { avatarInitials, avatarSource, showAvatarImage } from "@/lib/avatar";

describe("avatarSource", () => {
  it("accepts https urls only", () => {
    expect(avatarSource("https://cdn.example/a.jpg")).toBe("https://cdn.example/a.jpg");
    expect(avatarSource("  https://cdn.example/a.jpg ")).toBe("https://cdn.example/a.jpg");
    expect(avatarSource("http://cdn.example/a.jpg")).toBeNull();
    expect(avatarSource("data:image/svg+xml,<svg/>")).toBeNull();
    expect(avatarSource("//cdn.example/a.jpg")).toBeNull();
    expect(avatarSource("javascript:alert(1)")).toBeNull();
    expect(avatarSource("")).toBeNull();
    expect(avatarSource(null)).toBeNull();
    expect(avatarSource(undefined)).toBeNull();
  });
});

describe("avatarInitials", () => {
  it("builds initials and never returns an empty string", () => {
    expect(avatarInitials("giulia.rossi")).toBe("GR");
    expect(avatarInitials("marco")).toBe("MA");
    expect(avatarInitials("  ")).toBe("?");
  });
});

describe("showAvatarImage", () => {
  it("falls back when the source is missing or failed", () => {
    expect(showAvatarImage("https://a", null)).toBe(true);
    expect(showAvatarImage("https://a", "https://a")).toBe(false);
    expect(showAvatarImage("https://b", "https://a")).toBe(true);
    expect(showAvatarImage(null, null)).toBe(false);
  });
});
