import type { Db } from "@nodistraction/db";
import { following, posts } from "@nodistraction/db";
import { and, desc, eq, gte, inArray, lt, or } from "drizzle-orm";
import { z } from "zod";
import { isLocked } from "@/lib/budget";
import {
  loadAllowedAuthors,
  loadBudgetState,
  loadSettings,
  recencyCutoff,
} from "@/lib/sync/settings";

export const FEED_PAGE_SIZE = 30;
const SCAN_BATCH = 100;

const mediaListSchema = z.compile(
  z.array(
    z.object({
      kind: z.enum(["image", "video"]),
      url: z.string(),
      width: z.number(),
      height: z.number(),
    }),
  ),
);

export type MediaList = z.output<typeof mediaListSchema>;

export const parseMedia = (mediaJson: string): MediaList =>
  mediaListSchema.parse(JSON.parse(mediaJson));

export type FeedPost = {
  id: string;
  shortcode: string | null;
  productType: string | null;
  authorId: string;
  authorUsername: string;
  authorAvatarUrl: string | null;
  caption: string | null;
  takenAt: number;
  seen: boolean;
  media: MediaList;
};

export type FeedCursor = { takenAt: number; id: string };

export type FeedPage = {
  items: FeedPost[];
  nextCursor: FeedCursor | null;
  lockedUntil: number | null;
};

const loadAvatars = async (
  db: Db,
  ownerId: string,
  authorIds: string[],
): Promise<Map<string, string | null>> => {
  if (authorIds.length === 0) return new Map();
  const rows = await db
    .select({ igUserId: following.igUserId, avatarUrl: following.avatarUrl })
    .from(following)
    .where(and(eq(following.ownerId, ownerId), inArray(following.igUserId, authorIds)));
  return new Map(rows.map((row) => [row.igUserId, row.avatarUrl]));
};

export const listFeed = async (
  db: Db,
  ownerId: string,
  options: { cursor?: FeedCursor | undefined; limit?: number | undefined; now: Date },
): Promise<FeedPage> => {
  const limit = options.limit ?? FEED_PAGE_SIZE;
  const { budgetLockedUntil } = await loadBudgetState(db, ownerId);
  if (isLocked(budgetLockedUntil, options.now.getTime())) {
    return { items: [], nextCursor: null, lockedUntil: budgetLockedUntil };
  }
  const { recencyDays } = await loadSettings(db, ownerId);
  const cutoff = new Date(recencyCutoff(options.now, recencyDays));
  const allowed = await loadAllowedAuthors(db, ownerId);
  if (allowed.size === 0) return { items: [], nextCursor: null, lockedUntil: null };

  const items: FeedPost[] = [];
  let before = options.cursor;
  let exhausted = false;
  while (items.length < limit + 1 && !exhausted) {
    const rows = await db
      .select()
      .from(posts)
      .where(
        and(
          eq(posts.ownerId, ownerId),
          gte(posts.takenAt, cutoff),
          before === undefined
            ? undefined
            : or(
                lt(posts.takenAt, new Date(before.takenAt)),
                and(eq(posts.takenAt, new Date(before.takenAt)), lt(posts.id, before.id)),
              ),
        ),
      )
      .orderBy(desc(posts.takenAt), desc(posts.id))
      .limit(SCAN_BATCH);
    exhausted = rows.length < SCAN_BATCH;
    const last = rows.at(-1);
    if (last) before = { takenAt: last.takenAt.getTime(), id: last.id };
    for (const row of rows) {
      if (allowed.has(row.authorId)) {
        items.push({
          id: row.id,
          shortcode: row.shortcode,
          productType: row.productType,
          authorId: row.authorId,
          authorUsername: row.authorUsername,
          authorAvatarUrl: null,
          caption: row.caption,
          takenAt: row.takenAt.getTime(),
          seen: row.seen,
          media: parseMedia(row.mediaJson),
        });
      }
    }
  }

  const page = items.slice(0, limit);
  const avatars = await loadAvatars(db, ownerId, [...new Set(page.map((item) => item.authorId))]);
  for (const item of page) item.authorAvatarUrl = avatars.get(item.authorId) ?? null;
  const hasMore = items.length > limit;
  const lastItem = page.at(-1);
  return {
    items: page,
    nextCursor: hasMore && lastItem ? { takenAt: lastItem.takenAt, id: lastItem.id } : null,
    lockedUntil: null,
  };
};
