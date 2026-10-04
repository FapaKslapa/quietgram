import { describe, expect, it } from "vitest";
import {
  badgeOf,
  coverOf,
  findSaved,
  type SavedItem,
  savedLabel,
  shouldAutoSync,
} from "@/lib/saved-grid";

const image = { kind: "image" as const, url: "a", width: 1, height: 1 };
const video = { kind: "video" as const, url: "b", width: 1, height: 1 };
const item = (media: SavedItem["media"]): SavedItem => ({
  id: "1",
  authorUsername: "giulia.r",
  caption: null,
  media,
});

describe("coverOf", () => {
  it("uses the first media or nothing", () => {
    expect(coverOf(item([image, video]))).toBe(image);
    expect(coverOf(item([]))).toBeNull();
  });
});

describe("badgeOf", () => {
  it("marks carousels and videos only", () => {
    expect(badgeOf(item([image, image, image]))).toEqual({ kind: "carousel", count: 3 });
    expect(badgeOf(item([video]))).toEqual({ kind: "video" });
    expect(badgeOf(item([image]))).toBeNull();
  });
});

describe("savedLabel", () => {
  it("describes the kind of post", () => {
    expect(savedLabel(item([image]))).toBe("Post salvato di giulia.r");
    expect(savedLabel(item([video]))).toBe("Post salvato di giulia.r, video");
    expect(savedLabel(item([image, image]))).toBe("Post salvato di giulia.r, 2 foto");
  });
});

describe("shouldAutoSync", () => {
  it("syncs once when the list is empty", () => {
    expect(shouldAutoSync(0, false)).toBe(true);
    expect(shouldAutoSync(0, true)).toBe(false);
    expect(shouldAutoSync(4, false)).toBe(false);
  });
});

describe("findSaved", () => {
  it("finds by id and tolerates null", () => {
    const items = [item([image])];
    expect(findSaved(items, "1")).toBe(items[0]);
    expect(findSaved(items, "x")).toBeNull();
    expect(findSaved(items, null)).toBeNull();
  });
});
