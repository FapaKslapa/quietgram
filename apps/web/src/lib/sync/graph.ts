import { following, mutuals, syncState } from "@nodistraction/db";
import type { IgUser } from "@nodistraction/ig";
import { and, eq, inArray, sql } from "drizzle-orm";
import { startAuthorsPhase } from "@/lib/sync/authors";
import { chunk, chunkRows } from "@/lib/sync/chunk";
import type { SyncDeps } from "@/lib/sync/deps";
import type { RunState } from "@/lib/sync/run-state";
import type { InstagramSource } from "@/lib/sync/source";

export const GRAPH_PAGES_PER_STEP = 5;

type FollowingState = Extract<RunState, { phase: "following" }>;
type FollowersState = Extract<RunState, { phase: "followers" }>;

export const MUTUALS_MAX_AGE_MS = 24 * 60 * 60_000;

export const mutualsAreStale = (
  refreshedAt: Date | null,
  now: Date,
  hasFollowing: boolean,
): boolean =>
  !hasFollowing ||
  refreshedAt === null ||
  now.getTime() - refreshedAt.getTime() > MUTUALS_MAX_AGE_MS;

export const hasStoredFollowing = async (deps: SyncDeps, ownerId: string): Promise<boolean> => {
  const [row] = await deps.db
    .select({ id: following.igUserId })
    .from(following)
    .where(eq(following.ownerId, ownerId))
    .limit(1);
  return row !== undefined;
};

const upsertFollowing = async (deps: SyncDeps, ownerId: string, users: IgUser[]): Promise<void> => {
  for (const rows of chunkRows(users, 8)) {
    await deps.db
      .insert(following)
      .values(
        rows.map((entry) => ({
          ownerId,
          igUserId: entry.id,
          username: entry.username,
          avatarUrl: entry.avatarUrl,
          avatarRefreshedAt: deps.now(),
          isVerified: entry.isVerified,
          latestReelMedia: entry.latestReelMedia,
        })),
      )
      .onConflictDoUpdate({
        target: [following.ownerId, following.igUserId],
        set: {
          username: sql`excluded.username`,
          avatarUrl: sql`excluded.avatar_url`,
          avatarRefreshedAt: sql`excluded.avatar_refreshed_at`,
          isVerified: sql`excluded.is_verified`,
          latestReelMedia: sql`excluded.latest_reel_media`,
        },
      });
  }
};

const removeUnfollowed = async (
  deps: SyncDeps,
  ownerId: string,
  currentIds: ReadonlySet<string>,
): Promise<void> => {
  const stored = await deps.db
    .select({ id: following.igUserId })
    .from(following)
    .where(eq(following.ownerId, ownerId));
  const stale = stored.map((row) => row.id).filter((id) => !currentIds.has(id));
  for (const ids of chunk(stale, 90)) {
    await deps.db
      .delete(following)
      .where(and(eq(following.ownerId, ownerId), inArray(following.igUserId, ids)));
  }
};

export const stepFollowing = async (
  deps: SyncDeps,
  ownerId: string,
  source: InstagramSource,
  igUserId: string,
  state: FollowingState,
): Promise<RunState> => {
  const ids = [...state.ids];
  let cursor = state.cursor;
  for (let page = 0; page < GRAPH_PAGES_PER_STEP; page += 1) {
    const result = await source.usersPage("following", igUserId, cursor);
    await upsertFollowing(deps, ownerId, result.users);
    ids.push(...result.users.map((entry) => entry.id));
    cursor = result.nextCursor;
    if (cursor === null) break;
  }
  if (cursor !== null) return { phase: "following", cursor, ids };
  await removeUnfollowed(deps, ownerId, new Set(ids));
  return { phase: "followers", cursor: null, ids };
};

const upsertMutuals = async (deps: SyncDeps, ownerId: string, users: IgUser[]): Promise<void> => {
  for (const rows of chunkRows(users, 4)) {
    await deps.db
      .insert(mutuals)
      .values(
        rows.map((entry) => ({
          ownerId,
          igUserId: entry.id,
          username: entry.username,
          avatarUrl: entry.avatarUrl,
        })),
      )
      .onConflictDoUpdate({
        target: [mutuals.ownerId, mutuals.igUserId],
        set: { username: sql`excluded.username`, avatarUrl: sql`excluded.avatar_url` },
      });
  }
};

export const stepFollowers = async (
  deps: SyncDeps,
  ownerId: string,
  source: InstagramSource,
  igUserId: string,
  state: FollowersState,
): Promise<RunState> => {
  const followingIds = new Set(state.ids);
  let cursor = state.cursor;
  if (cursor === null) await deps.db.delete(mutuals).where(eq(mutuals.ownerId, ownerId));
  for (let page = 0; page < GRAPH_PAGES_PER_STEP; page += 1) {
    const result = await source.usersPage("followers", igUserId, cursor);
    await upsertMutuals(
      deps,
      ownerId,
      result.users.filter((entry) => followingIds.has(entry.id)),
    );
    cursor = result.nextCursor;
    if (cursor === null) break;
  }
  if (cursor !== null) return { phase: "followers", cursor, ids: state.ids };
  await deps.db
    .insert(syncState)
    .values({ ownerId, mutualsRefreshedAt: deps.now() })
    .onConflictDoUpdate({
      target: syncState.ownerId,
      set: { mutualsRefreshedAt: deps.now() },
    });
  return source.kind === "engine"
    ? startAuthorsPhase(deps, ownerId)
    : { phase: "timeline", cursor: null, page: 0 };
};
