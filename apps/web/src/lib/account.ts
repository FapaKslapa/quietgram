import { formatCount } from "@/lib/count-format";
import type { SavedItem } from "@/lib/saved-grid";

const REEL_PRODUCT_TYPE = "clips";

export type AccountProfile = {
  username: string;
  fullName: string;
  biography: string;
  isPrivate: boolean;
  isVerified: boolean;
  followerCount: number;
  followingCount: number;
  mediaCount: number;
  friendship: { following: boolean; followedBy: boolean };
};

export type ProfilePost = {
  id: string;
  code: string | null;
  productType: string;
  authorUsername: string;
  caption: string | null;
  media: SavedItem["media"];
};

export type AccountStat = { label: string; value: string };

export const accountStats = (profile: AccountProfile): AccountStat[] => [
  { label: "Post", value: formatCount(profile.mediaCount) },
  { label: "Follower", value: formatCount(profile.followerCount) },
  { label: "Seguiti", value: formatCount(profile.followingCount) },
];

export const relationLabel = (friendship: AccountProfile["friendship"]): string | null => {
  if (friendship.following && friendship.followedBy) return "Vi seguite a vicenda";
  if (friendship.following) return "Lo segui";
  if (friendship.followedBy) return "Ti segue";
  return null;
};

export const postToTile = (post: ProfilePost): SavedItem => ({
  id: post.id,
  shortcode: post.code,
  productType: post.productType,
  authorUsername: post.authorUsername,
  caption: post.caption,
  media: post.media,
});

export const tileLabel = (item: SavedItem): string => {
  const base = `Post di ${item.authorUsername}`;
  if (item.media.length > 1) return `${base}, ${item.media.length} foto`;
  return item.media[0]?.kind === "video" ? `${base}, video` : base;
};

export const mergeTiles = (pages: readonly (readonly ProfilePost[])[]): SavedItem[] => {
  const unique = new Map<string, SavedItem>();
  for (const page of pages) {
    for (const post of page) {
      if (post.productType !== REEL_PRODUCT_TYPE) unique.set(post.id, postToTile(post));
    }
  }
  return [...unique.values()];
};
