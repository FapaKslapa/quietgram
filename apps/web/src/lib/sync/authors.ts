import { following } from "@nodistraction/db";
import { and, eq } from "drizzle-orm";
import type { SyncDeps } from "@/lib/sync/deps";
import { storePosts } from "@/lib/sync/posts-store";
import {
  AUTHORS_PER_STEP,
  MAX_AUTHORS_PER_RUN,
  POSTS_PER_AUTHOR,
  type RunState,
} from "@/lib/sync/run-state";
import { DAY_MS, loadAllowedAuthors, loadSettings, recencyCutoff } from "@/lib/sync/settings";
import type { InstagramSource } from "@/lib/sync/source";

type AuthorsState = Extract<RunState, { phase: "authors" }>;

const DORMANT_RECHECK_MS = 7 * DAY_MS;

const dueAuthors = async (deps: SyncDeps, ownerId: string, since: number): Promise<string[]> => {
  const allowed = await loadAllowedAuthors(deps.db, ownerId);
  const { recencyDays } = await loadSettings(deps.db, ownerId);
  const windowStart = recencyCutoff(new Date(since), recencyDays);
  const rows = await deps.db
    .select({
      id: following.igUserId,
      checkedAt: following.postsCheckedAt,
      lastPostAt: following.lastPostAt,
    })
    .from(following)
    .where(eq(following.ownerId, ownerId));
  const candidates = rows
    .filter((row) => allowed.has(row.id))
    .map((row) => ({
      id: row.id,
      checkedAt: row.checkedAt?.getTime() ?? null,
      dormant: row.lastPostAt !== null && row.lastPostAt.getTime() < windowStart,
    }));
  return candidates
    .filter((row) =>
      row.dormant
        ? row.checkedAt === null || row.checkedAt < since - DORMANT_RECHECK_MS
        : row.checkedAt === null || row.checkedAt < since,
    )
    .sort(
      (left, right) =>
        Number(left.dormant) - Number(right.dormant) ||
        (left.checkedAt ?? 0) - (right.checkedAt ?? 0) ||
        left.id.localeCompare(right.id),
    )
    .map((row) => row.id);
};

export const startAuthorsPhase = async (deps: SyncDeps, ownerId: string): Promise<RunState> => {
  const since = deps.now().getTime();
  const due = await dueAuthors(deps, ownerId, since);
  return { phase: "authors", since, remaining: Math.min(due.length, MAX_AUTHORS_PER_RUN) };
};

export const stepAuthors = async (
  deps: SyncDeps,
  ownerId: string,
  source: InstagramSource,
  state: AuthorsState,
): Promise<RunState | null> => {
  const fetchPosts = source.userPosts;
  if (fetchPosts === null) throw new Error("Source cannot fetch posts per author");
  const due = await dueAuthors(deps, ownerId, state.since);
  const batch = due.slice(0, Math.min(AUTHORS_PER_STEP, state.remaining));
  for (const authorId of batch) {
    const fetched = await fetchPosts(authorId, POSTS_PER_AUTHOR);
    await storePosts(deps, ownerId, fetched);
    const newest = fetched.reduce<number | null>(
      (latest, post) => (latest === null || post.takenAt > latest ? post.takenAt : latest),
      null,
    );
    await deps.db
      .update(following)
      .set(
        newest === null
          ? { postsCheckedAt: deps.now() }
          : { postsCheckedAt: deps.now(), lastPostAt: new Date(newest) },
      )
      .where(and(eq(following.ownerId, ownerId), eq(following.igUserId, authorId)));
  }
  const remaining = Math.min(state.remaining - batch.length, due.length - batch.length);
  return remaining > 0 ? { ...state, remaining } : null;
};
