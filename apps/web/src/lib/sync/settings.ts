import { type Db, feedExceptions, following, mutuals, userSettings } from "@nodistraction/db";
import { eq } from "drizzle-orm";
import { type FeedMode, resolveAllowedAuthors } from "@/lib/sync/feed-mode";

export const DEFAULT_FEED_MODE: FeedMode = "friends";
export const DEFAULT_CREATOR_THRESHOLD = 10_000;

export const DEFAULT_RECENCY_DAYS = 14;
export const MIN_RECENCY_DAYS = 3;
export const MAX_RECENCY_DAYS = 60;
export const POST_RETENTION_DAYS = 60;
export const DAY_MS = 86_400_000;

export const recencyCutoff = (now: Date, recencyDays: number): number =>
  now.getTime() - recencyDays * DAY_MS;

export type FeedSettings = { feedMode: FeedMode; creatorThreshold: number; recencyDays: number };

export const loadSettings = async (db: Db, ownerId: string): Promise<FeedSettings> => {
  const [row] = await db.select().from(userSettings).where(eq(userSettings.ownerId, ownerId));
  return {
    feedMode: row?.feedMode ?? DEFAULT_FEED_MODE,
    creatorThreshold: row?.creatorThreshold ?? DEFAULT_CREATOR_THRESHOLD,
    recencyDays: row?.recencyDays ?? DEFAULT_RECENCY_DAYS,
  };
};

export type BudgetState = {
  grayscaleMedia: boolean;
  sessionBudgetMinutes: number | null;
  budgetLockedUntil: number | null;
};

export const loadBudgetState = async (db: Db, ownerId: string): Promise<BudgetState> => {
  const [row] = await db.select().from(userSettings).where(eq(userSettings.ownerId, ownerId));
  return {
    grayscaleMedia: row?.grayscaleMedia ?? false,
    sessionBudgetMinutes: row?.sessionBudgetMinutes ?? null,
    budgetLockedUntil: row?.budgetLockedUntil?.getTime() ?? null,
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

export const loadDmSendEnabled = async (db: Db, ownerId: string): Promise<boolean> => {
  const [row] = await db
    .select({ enabled: userSettings.dmSendEnabled })
    .from(userSettings)
    .where(eq(userSettings.ownerId, ownerId));
  return row?.enabled ?? false;
};
