import { describe, expect, it } from "vitest";
import {
  type AccountProfile,
  accountStats,
  mergeTiles,
  type ProfilePost,
  relationLabel,
  tileLabel,
} from "@/lib/account";

const profile: AccountProfile = {
  username: "giulia.r",
  fullName: "Giulia Rossi",
  biography: "",
  isPrivate: false,
  isVerified: false,
  followerCount: 12_400,
  followingCount: 380,
  mediaCount: 1_204,
  friendship: { following: false, followedBy: false },
};

const post = (id: string, kinds: ("image" | "video")[]): ProfilePost => ({
  id,
  code: `c${id}`,
  productType: "feed",
  authorUsername: "giulia.r",
  caption: null,
  media: kinds.map((kind) => ({ kind, url: `u${id}`, width: 1, height: 1 })),
});

describe("accountStats", () => {
  it("formats the three counters", () => {
    expect(accountStats(profile)).toEqual([
      { label: "Post", value: "1.204" },
      { label: "Follower", value: "12,4 k" },
      { label: "Seguiti", value: "380" },
    ]);
  });
});

describe("relationLabel", () => {
  it("describes each relation", () => {
    expect(relationLabel({ following: true, followedBy: true })).toBe("Vi seguite a vicenda");
    expect(relationLabel({ following: true, followedBy: false })).toBe("Lo segui");
    expect(relationLabel({ following: false, followedBy: true })).toBe("Ti segue");
    expect(relationLabel({ following: false, followedBy: false })).toBeNull();
  });
});

describe("tileLabel and mergeTiles", () => {
  it("labels carousels and videos", () => {
    const [carousel, video, single] = mergeTiles([
      [post("1", ["image", "image"]), post("2", ["video"]), post("3", ["image"])],
    ]);
    expect(carousel && tileLabel(carousel)).toBe("Post di giulia.r, 2 foto");
    expect(video && tileLabel(video)).toBe("Post di giulia.r, video");
    expect(single && tileLabel(single)).toBe("Post di giulia.r");
  });

  it("leaves reels out", () => {
    const reel = { ...post("9", ["video"]), productType: "clips" };
    expect(mergeTiles([[reel, post("1", ["image"])]]).map((tile) => tile.id)).toEqual(["1"]);
  });

  it("drops duplicates across pages and maps the shortcode", () => {
    const tiles = mergeTiles([
      [post("1", ["image"])],
      [post("1", ["image"]), post("2", ["image"])],
    ]);
    expect(tiles.map((tile) => tile.id)).toEqual(["1", "2"]);
    expect(tiles[0]?.shortcode).toBe("c1");
  });
});
