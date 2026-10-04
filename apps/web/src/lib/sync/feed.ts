import type { Db } from "@nodistraction/db";
import { posts } from "@nodistraction/db";
import { and, desc, eq, lt } from "drizzle-orm";
import { z } from "zod";
import { loadAllowedAuthors } from "@/lib/sync/settings";

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
  authorId: string;
  authorUsername: string;
  caption: string | null;
  takenAt: number;
  seen: boolean;
  media: MediaList;
};

export type FeedPage = { items: FeedPost[]; nextCursor: number | null };

export const listFeed = async (
  db: Db,
  ownerId: string,
  options: { cursor?: number | undefined; limit?: number | undefined },
): Promise<FeedPage> => {
  const limit = options.limit ?? FEED_PAGE_SIZE;
  const allowed = await loadAllowedAuthors(db, ownerId);
  if (allowed.size === 0) return { items: [], nextCursor: null };

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
          before === undefined ? undefined : lt(posts.takenAt, new Date(before)),
        ),
      )
      .orderBy(desc(posts.takenAt), desc(posts.id))
      .limit(SCAN_BATCH);
    exhausted = rows.length < SCAN_BATCH;
    const last = rows.at(-1);
    if (last) before = last.takenAt.getTime();
    for (const row of rows) {
      if (allowed.has(row.authorId)) {
        items.push({
          id: row.id,
          authorId: row.authorId,
          authorUsername: row.authorUsername,
          caption: row.caption,
          takenAt: row.takenAt.getTime(),
          seen: row.seen,
          media: parseMedia(row.mediaJson),
        });
      }
    }
  }

  const page = items.slice(0, limit);
  const hasMore = items.length > limit;
  const lastItem = page.at(-1);
  return { items: page, nextCursor: hasMore && lastItem ? lastItem.takenAt : null };
};
