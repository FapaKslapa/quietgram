import type { feedModes } from "@nodistraction/db";

export type FeedMode = (typeof feedModes)[number];

export type FollowingRow = {
  igUserId: string;
  followerCount: number | null;
  isVerified: boolean;
  isBusiness: boolean;
};

export type AllowedAuthorsInput = {
  mode: FeedMode;
  following: FollowingRow[];
  mutualIds: ReadonlySet<string>;
  exceptionIds: ReadonlySet<string>;
  threshold: number;
};

const isCreator = (entry: FollowingRow, threshold: number): boolean =>
  entry.isVerified ||
  entry.isBusiness ||
  (entry.followerCount !== null && entry.followerCount >= threshold);

export const resolveAllowedAuthors = ({
  mode,
  following,
  mutualIds,
  exceptionIds,
  threshold,
}: AllowedAuthorsInput): Set<string> => {
  switch (mode) {
    case "friends":
      return new Set([
        ...mutualIds,
        ...following.filter((entry) => exceptionIds.has(entry.igUserId)).map((e) => e.igUserId),
      ]);
    case "following":
      return new Set(following.map((entry) => entry.igUserId));
    case "creators":
      return new Set(
        following.filter((entry) => isCreator(entry, threshold)).map((entry) => entry.igUserId),
      );
  }
};
