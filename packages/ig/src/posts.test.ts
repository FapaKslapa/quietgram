import { describe, expect, it } from "vitest";
import savedFixture from "../fixtures/saved.json" with { type: "json" };
import timelineFixture from "../fixtures/timeline.json" with { type: "json" };
import userFeedFixture from "../fixtures/user-feed.json" with { type: "json" };
import { fetchSaved, fetchTimeline, fetchUserPosts, isReel } from "./posts";
import type { Requester } from "./request";

const requesterReturning = (response: unknown) => {
  const paths: string[] = [];
  const requester: Requester = {
    get: async (path) => {
      paths.push(path);
      return response;
    },
    postForm: async () => {
      throw new Error("unexpected write");
    },
  };
  return { requester, paths };
};

const author = { id: "5078", username: "user_d", avatarUrl: null };

describe("isReel", () => {
  it("flags clips only", () => {
    expect(isReel({ product_type: "clips" })).toBe(true);
    expect(isReel({ product_type: "feed" })).toBe(false);
    expect(isReel({ product_type: "carousel_container" })).toBe(false);
    expect(isReel({ product_type: null })).toBe(false);
  });
});

describe("fetchUserPosts", () => {
  it("drops reels", async () => {
    const { requester } = requesterReturning(userFeedFixture);
    const posts = await fetchUserPosts(requester, author);
    expect(posts).toHaveLength(3);
    expect(posts.map((post) => post.id)).not.toContain(userFeedFixture.items[2]?.pk);
  });

  it("maps a carousel mixing images and videos", async () => {
    const { requester } = requesterReturning(userFeedFixture);
    const [carousel] = await fetchUserPosts(requester, author);
    expect(carousel?.media.map((media) => media.kind)).toEqual(["image", "image", "video"]);
    expect(carousel?.media[2]?.url).toMatch(/^https:\/\/example\.invalid\/video\//);
    expect(carousel?.caption).toBe("Fake caption");
    expect(carousel?.takenAt).toBe((userFeedFixture.items[0]?.taken_at ?? 0) * 1000);
    expect(carousel?.authorUsername).toBe("user_d");
  });

  it("maps a single image with a null caption", async () => {
    const { requester } = requesterReturning(userFeedFixture);
    const posts = await fetchUserPosts(requester, author);
    expect(posts[1]?.caption).toBeNull();
    expect(posts[1]?.media).toHaveLength(1);
    expect(posts[1]?.media[0]).toMatchObject({ kind: "image", width: expect.any(Number) });
  });

  it("requests the feed of the given user", async () => {
    const { requester, paths } = requesterReturning({ items: [] });
    expect(await fetchUserPosts(requester, author)).toEqual([]);
    expect(paths).toEqual(["/api/v1/feed/user/5078/"]);
  });
});

describe("fetchSaved", () => {
  it("drops reels from saved posts", async () => {
    const { requester, paths } = requesterReturning(savedFixture);
    const posts = await fetchSaved(requester);
    expect(posts).toHaveLength(1);
    expect(posts[0]?.media.map((media) => media.kind)).toEqual(["image", "image", "video"]);
    expect(paths).toEqual(["/api/v1/feed/saved/posts/"]);
  });
});

describe("fetchTimeline", () => {
  it("skips ads and keeps only posts from allowed authors", async () => {
    const { requester } = requesterReturning(timelineFixture);
    const all = await fetchTimeline(requester, () => true);
    expect(all).toHaveLength(2);
    const none = await fetchTimeline(requester, () => false);
    expect(none).toEqual([]);
  });
});
