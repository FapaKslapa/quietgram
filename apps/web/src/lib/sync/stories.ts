import { type Db, storyTray } from "@nodistraction/db";
import type { IgStory, IgTrayEntry } from "@nodistraction/ig";
import { asc, eq } from "drizzle-orm";
import { refreshStaleAvatars } from "@/lib/sync/avatars";
import { chunkRows } from "@/lib/sync/chunk";
import { STORIES_COOLDOWN_MS } from "@/lib/sync/cooldown";
import type { SyncDeps } from "@/lib/sync/deps";
import { isFresh, markSynced } from "@/lib/sync/marks";
import { withIgSession } from "@/lib/sync/session";

const TRAY_SCOPE = "stories:tray";

export const listTray = async (db: Db, ownerId: string): Promise<IgTrayEntry[]> => {
  const rows = await db
    .select()
    .from(storyTray)
    .where(eq(storyTray.ownerId, ownerId))
    .orderBy(asc(storyTray.position));
  return rows.map((row) => ({
    userId: row.userId,
    username: row.username,
    avatarUrl: row.avatarUrl,
    latestReelMedia: row.latestReelMedia,
    seen: row.seen,
  }));
};

export const syncTray = async (deps: SyncDeps, ownerId: string): Promise<void> => {
  if (await isFresh(deps, ownerId, TRAY_SCOPE, STORIES_COOLDOWN_MS)) return;
  const entries = await withIgSession(deps, ownerId, ({ source }) => source.storiesTray());
  const fetchedAt = deps.now();
  await deps.db.delete(storyTray).where(eq(storyTray.ownerId, ownerId));
  const rows = entries.map((entry, position) => ({ ...entry, ownerId, position, fetchedAt }));
  for (const group of chunkRows(rows, 8)) {
    await deps.db.insert(storyTray).values(group).onConflictDoNothing();
  }
  await refreshStaleAvatars(deps.db, ownerId, entries, fetchedAt);
  await markSynced(deps, ownerId, TRAY_SCOPE);
};

export const fetchUserStories = (
  deps: SyncDeps,
  ownerId: string,
  userId: string,
): Promise<IgStory[]> => withIgSession(deps, ownerId, ({ source }) => source.userStories(userId));
