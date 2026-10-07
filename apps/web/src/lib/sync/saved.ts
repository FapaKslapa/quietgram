import { type Db, following, postState, runBatch, saved } from "@nodistraction/db";
import type { IgPost } from "@nodistraction/ig";
import { and, asc, eq, inArray, notInArray } from "drizzle-orm";
import { chunkRows } from "@/lib/sync/chunk";
import { SAVED_COOLDOWN_MS } from "@/lib/sync/cooldown";
import type { SyncDeps } from "@/lib/sync/deps";
import { type MediaList, parseMedia } from "@/lib/sync/feed";
import { claimSync } from "@/lib/sync/marks";
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

export const SAVED_SCOPE = "saved";

export const syncSaved = async (deps: SyncDeps, ownerId: string): Promise<void> => {
  const release = await claimSync(deps, ownerId, SAVED_SCOPE, SAVED_COOLDOWN_MS);
  if (release === null) return;
  let items: IgPost[];
  try {
    items = await withIgSession(deps, ownerId, ({ source }) => source.saved());
  } catch (error) {
    await release();
    throw error;
  }
  const updatedAt = deps.now();
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
  const states = items.map((post) => ({
    ownerId,
    mediaId: post.id,
    saved: true,
    updatedAt,
  }));
  try {
    await runBatch(deps.db, [
      deps.db.delete(saved).where(eq(saved.ownerId, ownerId)),
      ...chunkRows(rows, 8).map((group) =>
        deps.db.insert(saved).values(group).onConflictDoNothing(),
      ),
      ...chunkRows(states, 4).map((group) =>
        deps.db
          .insert(postState)
          .values(group)
          .onConflictDoUpdate({
            target: [postState.ownerId, postState.mediaId],
            set: { saved: true, updatedAt },
          }),
      ),
      deps.db
        .update(postState)
        .set({ saved: false, updatedAt })
        .where(
          and(
            eq(postState.ownerId, ownerId),
            eq(postState.saved, true),
            notInArray(
              postState.mediaId,
              deps.db.select({ id: saved.id }).from(saved).where(eq(saved.ownerId, ownerId)),
            ),
          ),
        ),
    ]);
  } catch (error) {
    await release();
    throw error;
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
