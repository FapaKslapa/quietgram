import type { IgMedia } from "#ig/posts";

export const MAX_COMMENT_LENGTH = 2200;

export type IgTrayEntry = {
  userId: string;
  username: string;
  avatarUrl: string | null;
  latestReelMedia: number | null;
  seen: boolean;
};

export type IgStory = {
  id: string;
  takenAt: number;
  expiresAt: number;
  media: IgMedia;
  productType: string;
};

export type IgProfile = {
  id: string;
  username: string;
  fullName: string;
  biography: string;
  avatarUrl: string | null;
  isPrivate: boolean;
  isVerified: boolean;
  isBusiness: boolean;
  followerCount: number;
  followingCount: number;
  mediaCount: number;
  externalUrl: string | null;
  friendship: { following: boolean; followedBy: boolean };
};

export type IgComment = {
  id: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
  text: string;
  createdAt: number;
  likeCount: number;
  parentId: string | null;
};

export const validateCommentText = (text: string): string => {
  const trimmed = text.trim();
  if (trimmed.length === 0) throw new RangeError("Comment is empty");
  if (trimmed.length > MAX_COMMENT_LENGTH) throw new RangeError("Comment is too long");
  return trimmed;
};
