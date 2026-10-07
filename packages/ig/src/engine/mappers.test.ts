import { describe, expect, it } from "vitest";
import { toMessage, toPosts, toUsers } from "#ig/engine/mappers";

const post = (id: string, productType?: string) => ({
  id,
  product_type: productType,
  author_id: "1",
  author_username: "giulia",
  taken_at_ms: 1_000,
  media: [{ kind: "image" as const, url: "https://cdn.example/a.jpg" }],
});

describe("toPosts", () => {
  it("drops reels and defaults missing fields", () => {
    const [only, ...rest] = toPosts([post("a"), post("b", "clips")]);
    expect(rest).toEqual([]);
    expect(only).toMatchObject({
      id: "a",
      code: null,
      productType: "feed",
      caption: null,
      media: [{ kind: "image", url: "https://cdn.example/a.jpg", width: 0, height: 0 }],
    });
  });
});

describe("toUsers", () => {
  it("fills optional fields with defaults", () => {
    expect(toUsers({ users: [{ id: "1", username: "giulia" }] })).toEqual([
      { id: "1", username: "giulia", avatarUrl: null, isVerified: false, latestReelMedia: null },
    ]);
  });
});

describe("toMessage", () => {
  it("infers the kind from the text when absent", () => {
    expect(toMessage({ id: "m", sent_at_ms: 5, text: "ciao" })).toMatchObject({
      kind: "text",
      type: "text",
      senderId: "",
    });
    expect(toMessage({ id: "m", sent_at_ms: 5, text: null })).toMatchObject({
      kind: "other",
      type: "other",
    });
  });
});
