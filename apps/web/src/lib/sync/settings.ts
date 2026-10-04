import { type Db, feedExceptions, following, mutuals, userSettings } from "@nodistraction/db";
import { eq } from "drizzle-orm";
import { type FeedMode, resolveAllowedAuthors } from "@/lib/sync/feed-mode";

export const DEFAULT_FEED_MODE: FeedMode = "friends";
export const DEFAULT_CREATOR_THRESHOLD = 10_000;

export type FeedSettings = { feedMode: FeedMode; creatorThreshold: number };

export const loadSettings = async (db: Db, ownerId: string): Promise<FeedSettings> => {
  const [row] = await db.select().from(userSettings).where(eq(userSettings.ownerId, ownerId));
  return {
    feedMode: row?.feedMode ?? DEFAULT_FEED_MODE,
    creatorThreshold: row?.creatorThreshold ?? DEFAULT_CREATOR_THRESHOLD,
  };
};

export const loadAllowedAuthors = async (db: Db, ownerId: string): Promise<Set<string>> => {
  const settings = await loadSettings(db, ownerId);
  const [followingRows, mutualRows, exceptionRows] = await Promise.all([
    db.select().from(following).where(eq(following.ownerId, ownerId)),
    db.select({ id: mutuals.igUserId }).from(mutuals).where(eq(mutuals.ownerId, ownerId)),
    db
      .select({ id: feedExceptions.igUserId })
      .from(feedExceptions)
      .where(eq(feedExceptions.ownerId, ownerId)),
  ]);
  return resolveAllowedAuthors({
    mode: settings.feedMode,
    following: followingRows,
    mutualIds: new Set(mutualRows.map((row) => row.id)),
    exceptionIds: new Set(exceptionRows.map((row) => row.id)),
    threshold: settings.creatorThreshold,
  });
};
