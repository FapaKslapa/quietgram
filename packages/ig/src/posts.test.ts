import { describe, expect, it } from "vitest";
import savedFixture from "#fixtures/saved.json" with { type: "json" };
import timelineFixture from "#fixtures/timeline.json" with { type: "json" };
import { fetchSaved, fetchTimelinePage, filterByAuthors, type IgPost, isReel } from "#ig/posts";
import type { Requester } from "#ig/request";

const requesterReturning = (response: unknown) => {
  const paths: string[] = [];
  const requester: Requester = {
    get: async (path, params) => {
      paths.push(params ? `${path}?${new URLSearchParams(params)}` : path);
      return response;
    },
    postForm: async () => {
      throw new Error("unexpected write");
    },
  };
  return { requester, paths };
};

describe("isReel", () => {
  it("flags clips only", () => {
    expect(isReel({ product_type: "clips" })).toBe(true);
    expect(isReel({ product_type: "feed" })).toBe(false);
    expect(isReel({ product_type: "carousel_container" })).toBe(false);
    expect(isReel({ product_type: null })).toBe(false);
  });
});

describe("fetchSaved", () => {
  it("keeps reels in saved posts", async () => {
    const { requester, paths } = requesterReturning(savedFixture);
    const posts = await fetchSaved(requester);
    expect(posts.length).toBeGreaterThan(1);
    expect(posts.some((post) => post.media.some((media) => media.kind === "video"))).toBe(true);
    expect(paths).toEqual(["/api/v1/feed/saved/posts/"]);
  });
});

describe("fetchTimelinePage", () => {
  it("skips ads and reels and exposes the next cursor", async () => {
    const { requester, paths } = requesterReturning(timelineFixture);
    const page = await fetchTimelinePage(requester);
    expect(page.posts).toHaveLength(2);
    expect(page.nextCursor).toBe("FAKE_CURSOR");
    expect(paths).toEqual(["/api/v1/feed/timeline/"]);
  });

  it("sends the cursor as max_id", async () => {
    const { requester, paths } = requesterReturning({ feed_items: [] });
    const page = await fetchTimelinePage(requester, "abc");
    expect(page).toEqual({ posts: [], nextCursor: null });
    expect(paths).toEqual(["/api/v1/feed/timeline/?max_id=abc"]);
  });
});

describe("filterByAuthors", () => {
  const post = (authorId: string): IgPost => ({
    id: authorId,
    authorId,
    authorUsername: "u",
    caption: null,
    takenAt: 0,
    media: [],
  });

  it("keeps only posts from allowed authors", () => {
    const posts = [post("1"), post("2"), post("3")];
    expect(filterByAuthors(posts, new Set(["1", "3"])).map((p) => p.authorId)).toEqual(["1", "3"]);
    expect(filterByAuthors(posts, new Set())).toEqual([]);
  });
});
