import { describe, expect, it } from "vitest";
import { instagramUrl } from "@/lib/instagram-link";

describe("instagramUrl", () => {
  it("links feed posts and carousels to /p/", () => {
    expect(instagramUrl("Cabc123", "feed")).toBe("https://www.instagram.com/p/Cabc123/");
    expect(instagramUrl("Cabc123", "carousel_container")).toBe(
      "https://www.instagram.com/p/Cabc123/",
    );
    expect(instagramUrl("Cabc123", null)).toBe("https://www.instagram.com/p/Cabc123/");
  });

  it("links reels to /reel/", () => {
    expect(instagramUrl("Cabc123", "clips")).toBe("https://www.instagram.com/reel/Cabc123/");
  });

  it("returns nothing without a usable code", () => {
    expect(instagramUrl(null, "feed")).toBeNull();
    expect(instagramUrl(undefined, "feed")).toBeNull();
    expect(instagramUrl("", "feed")).toBeNull();
    expect(instagramUrl("../evil", "feed")).toBeNull();
  });
});
