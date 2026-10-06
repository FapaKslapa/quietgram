import { type Db, saved } from "@nodistraction/db";
import { asc, eq } from "drizzle-orm";
import { chunkRows } from "@/lib/sync/chunk";
import type { SyncDeps } from "@/lib/sync/deps";
import { type MediaList, parseMedia } from "@/lib/sync/feed";
import { withIgSession } from "@/lib/sync/session";

export type SavedPost = {
  id: string;
  shortcode: string | null;
  productType: string | null;
  authorUsername: string;
  caption: string | null;
  media: MediaList;
};

export const syncSaved = async (deps: SyncDeps, ownerId: string): Promise<void> => {
  const items = await withIgSession(deps, ownerId, ({ source }) => source.saved());
  await deps.db.delete(saved).where(eq(saved.ownerId, ownerId));
  const rows = items.map((post, position) => ({
    id: post.id,
    shortcode: post.code,
    productType: post.productType,
    ownerId,
    authorUsername: post.authorUsername,
    caption: post.caption,
    mediaJson: JSON.stringify(post.media),
    position,
  }));
  for (const group of chunkRows(rows, 8)) {
    await deps.db.insert(saved).values(group).onConflictDoNothing();
  }
};

export const listSaved = async (db: Db, ownerId: string): Promise<SavedPost[]> => {
  const rows = await db
    .select()
    .from(saved)
    .where(eq(saved.ownerId, ownerId))
    .orderBy(asc(saved.position));
  return rows.map((row) => ({
    id: row.id,
    shortcode: row.shortcode,
    productType: row.productType,
    authorUsername: row.authorUsername,
    caption: row.caption,
    media: parseMedia(row.mediaJson),
  }));
};
