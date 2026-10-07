import {
  AVATAR_A,
  DUSK,
  EMBER,
  LAKE,
  MEADOW,
  MORNING,
  MOUNTAIN,
  SAND,
  VIDEO,
} from "@/app/dev/gallery/fixtures/media";
import type { AccountProfile, ProfilePost } from "@/lib/account";
import type { PostMediaItem } from "@/lib/media";

export const ACCOUNT: AccountProfile & { avatarUrl: string | null } = {
  username: "giulia.r",
  fullName: "Giulia Rossi",
  biography: "Fotografa a Torino.\nColazioni, montagna e luce del mattino.",
  avatarUrl: AVATAR_A,
  isPrivate: false,
  isVerified: true,
  followerCount: 12_430,
  followingCount: 380,
  mediaCount: 1_204,
  friendship: { following: true, followedBy: false },
};

const profilePost = (id: string, media: PostMediaItem[]): ProfilePost => ({
  id,
  code: null,
  productType: "feed",
  authorUsername: "giulia.r",
  caption: null,
  media,
});

export const ACCOUNT_POSTS: ProfilePost[] = [
  profilePost("a1", [MORNING]),
  profilePost("a2", [MOUNTAIN, DUSK, EMBER]),
  profilePost("a3", [VIDEO]),
  profilePost("a4", [MEADOW]),
  profilePost("a5", [LAKE]),
  profilePost("a6", [SAND]),
];
