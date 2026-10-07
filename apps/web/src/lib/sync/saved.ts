import { type Db, following, saved } from "@nodistraction/db";
import { and, asc, eq, inArray } from "drizzle-orm";
import { chunkRows } from "@/lib/sync/chunk";
import type { SyncDeps } from "@/lib/sync/deps";
import { type MediaList, parseMedia } from "@/lib/sync/feed";
import { loadPostStates } from "@/lib/sync/post-state";
import { withIgSession } from "@/lib/sync/session";

export type SavedPost = {
  id: string;
  shortcode: string | null;
  productType: string | null;
  authorUsername: string;
  authorAvatarUrl: string | null;
  caption: string | null;
  liked: boolean;
  saved: boolean;
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

const loadAvatarsByUsername = async (
  db: Db,
  ownerId: string,
  usernames: string[],
): Promise<Map<string, string | null>> => {
  if (usernames.length === 0) return new Map();
  const rows = await db
    .select({ username: following.username, avatarUrl: following.avatarUrl })
    .from(following)
    .where(and(eq(following.ownerId, ownerId), inArray(following.username, usernames)));
  return new Map(rows.map((row) => [row.username, row.avatarUrl]));
};

export const listSaved = async (db: Db, ownerId: string): Promise<SavedPost[]> => {
  const rows = await db
    .select()
    .from(saved)
    .where(eq(saved.ownerId, ownerId))
    .orderBy(asc(saved.position));
  const [states, avatars] = await Promise.all([
    loadPostStates(
      db,
      ownerId,
      rows.map((row) => row.id),
    ),
    loadAvatarsByUsername(db, ownerId, [...new Set(rows.map((row) => row.authorUsername))]),
  ]);
  return rows.map((row) => ({
    id: row.id,
    shortcode: row.shortcode,
    productType: row.productType,
    authorUsername: row.authorUsername,
    authorAvatarUrl: avatars.get(row.authorUsername) ?? null,
    caption: row.caption,
    liked: states.get(row.id)?.liked ?? false,
    saved: states.get(row.id)?.saved ?? true,
    media: parseMedia(row.mediaJson),
  }));
};
