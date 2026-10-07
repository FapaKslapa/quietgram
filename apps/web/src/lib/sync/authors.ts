import { following, syncRuns } from "@nodistraction/db";
import { and, desc, eq, inArray } from "drizzle-orm";
import type { SyncDeps } from "@/lib/sync/deps";
import type { FeedMode } from "@/lib/sync/feed-mode";
import { NORMAL_LIMITS, type SyncLimits } from "@/lib/sync/limits";
import { overlapped } from "@/lib/sync/overlapped";
import { storePosts } from "@/lib/sync/posts-store";
import {
  afterAuthors,
  maxAuthorsForRun,
  POSTS_PER_AUTHOR,
  type RunState,
} from "@/lib/sync/run-state";
import { DAY_MS, loadAllowedAuthors, loadSettings, recencyCutoff } from "@/lib/sync/settings";
import type { InstagramSource } from "@/lib/sync/source";

type AuthorsState = Extract<RunState, { phase: "authors" }>;

const DORMANT_RECHECK_MS = 7 * DAY_MS;

export type AuthorCandidate = {
  id: string;
  checkedAt: number | null;
  lastPostAt: number | null;
  latestReelMedia: number | null;
};

const rankGroup = (candidate: AuthorCandidate, windowStart: number): number => {
  if (candidate.checkedAt === null) return 0;
  const dormant = candidate.lastPostAt !== null && candidate.lastPostAt < windowStart;
  return dormant ? 2 : 1;
};

export const rankAuthors = (
  candidates: AuthorCandidate[],
  since: number,
  windowStart: number,
): string[] =>
  candidates
    .filter((candidate) => {
      const group = rankGroup(candidate, windowStart);
      if (group === 0) return true;
      const checkedAt = candidate.checkedAt ?? 0;
      return group === 2 ? checkedAt < since - DORMANT_RECHECK_MS : checkedAt < since;
    })
    .sort((left, right) => {
      const leftGroup = rankGroup(left, windowStart);
      const rightGroup = rankGroup(right, windowStart);
      if (leftGroup !== rightGroup) return leftGroup - rightGroup;
      if (leftGroup === 0) {
        return (
          (right.latestReelMedia ?? -1) - (left.latestReelMedia ?? -1) ||
          left.id.localeCompare(right.id)
        );
      }
      return (left.checkedAt ?? 0) - (right.checkedAt ?? 0) || left.id.localeCompare(right.id);
    })
    .map((candidate) => candidate.id);

const allowedPopulation = async (
  deps: SyncDeps,
  ownerId: string,
): Promise<{
  allowed: Set<string>;
  candidates: AuthorCandidate[];
  windowStart: (since: number) => number;
}> => {
  const [allowed, { recencyDays }, rows] = await Promise.all([
    loadAllowedAuthors(deps.db, ownerId),
    loadSettings(deps.db, ownerId),
    deps.db
      .select({
        id: following.igUserId,
        checkedAt: following.postsCheckedAt,
        lastPostAt: following.lastPostAt,
        latestReelMedia: following.latestReelMedia,
      })
      .from(following)
      .where(eq(following.ownerId, ownerId)),
  ]);
  const candidates = rows
    .filter((row) => allowed.has(row.id))
    .map((row) => ({
      id: row.id,
      checkedAt: row.checkedAt?.getTime() ?? null,
      lastPostAt: row.lastPostAt?.getTime() ?? null,
      latestReelMedia: row.latestReelMedia,
    }));
  return {
    allowed,
    candidates,
    windowStart: (since) => recencyCutoff(new Date(since), recencyDays),
  };
};

const dueAuthors = async (deps: SyncDeps, ownerId: string, since: number): Promise<string[]> => {
  const { candidates, windowStart } = await allowedPopulation(deps, ownerId);
  return rankAuthors(candidates, since, windowStart(since));
};

const previousRunCompleted = async (deps: SyncDeps, ownerId: string): Promise<boolean> => {
  const [run] = await deps.db
    .select({ status: syncRuns.status })
    .from(syncRuns)
    .where(
      and(
        eq(syncRuns.ownerId, ownerId),
        eq(syncRuns.kind, "refresh"),
        inArray(syncRuns.status, ["done", "failed"]),
      ),
    )
    .orderBy(desc(syncRuns.startedAt))
    .limit(1);
  return run?.status === "done";
};

export const startAuthorsPhase = async (
  deps: SyncDeps,
  ownerId: string,
  limits: SyncLimits = NORMAL_LIMITS,
): Promise<RunState> => {
  const since = deps.now().getTime();
  const { candidates, windowStart } = await allowedPopulation(deps, ownerId);
  const due = rankAuthors(candidates, since, windowStart(since));
  const planned = Math.min(
    due.length,
    maxAuthorsForRun(await previousRunCompleted(deps, ownerId), limits),
  );
  return { phase: "authors", since, remaining: planned, planned, population: candidates.length };
};

export const stepAuthors = async (
  deps: SyncDeps,
  ownerId: string,
  source: InstagramSource,
  state: AuthorsState,
  mode: FeedMode,
  limits: SyncLimits = NORMAL_LIMITS,
): Promise<RunState | null> => {
  const fetchPosts = source.userPosts;
  if (fetchPosts === null) throw new Error("Source cannot fetch posts per author");
  const due = await dueAuthors(deps, ownerId, state.since);
  const batch = due.slice(0, Math.min(limits.authorsPerStep, state.remaining));
  await overlapped(batch, async (authorId) => {
    const fetched = await fetchPosts(authorId, POSTS_PER_AUTHOR);
    const newest = fetched.reduce<number | null>(
      (latest, post) => (latest === null || post.takenAt > latest ? post.takenAt : latest),
      null,
    );
    return async () => {
      await storePosts(deps, ownerId, fetched, [
        deps.db
          .update(following)
          .set(
            newest === null
              ? { postsCheckedAt: deps.now() }
              : { postsCheckedAt: deps.now(), lastPostAt: new Date(newest) },
          )
          .where(and(eq(following.ownerId, ownerId), eq(following.igUserId, authorId))),
      ]);
    };
  });
  const remaining = Math.min(state.remaining - batch.length, due.length - batch.length);
  return remaining > 0 ? { ...state, remaining } : afterAuthors(mode);
};
